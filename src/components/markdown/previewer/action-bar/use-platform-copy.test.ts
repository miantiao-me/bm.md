import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlatformCopy } from './use-platform-copy'

const mocks = vi.hoisted(() => ({
  renderPlatformHtml: vi.fn(),
  setIsLoading: vi.fn(),
  filesState: {
    activeFileId: 'file-1' as string | null,
    contentFileId: 'file-1' as string | null,
    contentStatus: 'ready' as 'idle' | 'loading' | 'ready',
    currentContent: '初始内容',
  },
  previewState: {
    markdownStyle: 'initial-style',
    codeTheme: 'initial-code',
    mermaidTheme: '',
    infographic: { theme: 'default', palette: 'antv' },
    customCss: '',
    getRenderedHtml: vi.fn(() => '<section>预览错误页</section>'),
    setRenderedHtml: vi.fn(),
  },
  editorState: {
    enableFootnoteLinks: true,
    openLinksInNewWindow: true,
  },
}))

vi.mock('react', () => ({
  useState: <T>(initial: T) => [initial, mocks.setIsLoading] as const,
}))

vi.mock('@/lib/markdown/client-render', () => ({
  renderPlatformHtml: mocks.renderPlatformHtml,
}))

vi.mock('@/stores/files', () => {
  const useFilesStore = Object.assign(
    <T>(selector: (state: typeof mocks.filesState) => T) => selector(mocks.filesState),
    { getState: () => mocks.filesState },
  )
  const isFileContentReady = (state: typeof mocks.filesState) => state.contentStatus === 'ready' && state.contentFileId === state.activeFileId
  return { isFileContentReady, useFilesStore }
})

vi.mock('@/stores/preview', () => {
  const usePreviewStore = Object.assign(
    <T>(selector: (state: typeof mocks.previewState) => T) => selector(mocks.previewState),
    { getState: () => mocks.previewState },
  )
  return { usePreviewStore }
})

vi.mock('@/stores/editor', () => {
  const useEditorStore = Object.assign(
    <T>(selector: (state: typeof mocks.editorState) => T) => selector(mocks.editorState),
    { getState: () => mocks.editorState },
  )
  return { useEditorStore }
})

describe('usePlatformCopy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.filesState.activeFileId = 'file-1'
    mocks.filesState.contentFileId = 'file-1'
    mocks.filesState.contentStatus = 'ready'
    mocks.filesState.currentContent = '初始内容'
    mocks.previewState.markdownStyle = 'initial-style'
    mocks.editorState.openLinksInNewWindow = true
    mocks.renderPlatformHtml.mockResolvedValue('<section>完整平台 HTML</section>')
  })

  it('复制时忽略预览缓存并读取最新 Store 配置执行完整渲染', async () => {
    const { getHtml, isReady } = usePlatformCopy('html')

    expect(isReady).toBe(true)

    mocks.filesState.currentContent = '点击时内容'
    mocks.previewState.markdownStyle = 'click-time-style'
    mocks.editorState.openLinksInNewWindow = false

    const html = getHtml()
    expect(mocks.setIsLoading).toHaveBeenLastCalledWith(true)

    await expect(html).resolves.toBe('<section>完整平台 HTML</section>')
    expect(mocks.setIsLoading.mock.calls).toEqual([[true], [false]])
    expect(mocks.renderPlatformHtml).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'html',
      content: '点击时内容',
      markdownStyle: 'click-time-style',
      openLinksInNewWindow: false,
    }))
    expect(mocks.previewState.getRenderedHtml).not.toHaveBeenCalled()
  })

  it('点击时正文未就绪则拒绝复制且不渲染空正文', async () => {
    const { getHtml } = usePlatformCopy('html')
    mocks.filesState.contentStatus = 'loading'
    mocks.filesState.currentContent = ''

    await expect(getHtml()).rejects.toEqual(new Error('文件仍在加载'))
    expect(mocks.renderPlatformHtml).not.toHaveBeenCalled()
  })

  it('渲染失败时保留原始 Error', async () => {
    const error = new Error('原始错误')
    mocks.renderPlatformHtml.mockRejectedValue(error)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { getHtml } = usePlatformCopy('html')

    const html = getHtml()
    expect(mocks.setIsLoading).toHaveBeenLastCalledWith(true)

    await expect(html).rejects.toBe(error)
    expect(mocks.setIsLoading.mock.calls).toEqual([[true], [false]])
  })

  it('渲染抛出非 Error 值时转换为简短 Error', async () => {
    mocks.renderPlatformHtml.mockRejectedValue('原始错误')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { getHtml } = usePlatformCopy('html')

    await expect(getHtml()).rejects.toEqual(new Error('渲染失败'))
  })
})
