import type { PreviewSignatureInput } from './preview-ready'
import { afterEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { partializePreviewState, PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { DEFAULT_MARKDOWN_STYLE_ID } from '@/themes/markdown-style/metadata'
import { createPreviewSignature, isPreviewReadyNow } from './preview-ready'

const baseInput = {
  contentFileId: 'file-1',
  currentContent: '# 正文',
  previewWidth: PREVIEW_WIDTH_MOBILE,
  markdownStyle: DEFAULT_MARKDOWN_STYLE_ID,
  codeTheme: 'kimbie-light',
  mermaidTheme: '',
  infographicTheme: 'default',
  infographicPalette: 'antv',
  customCss: '',
  enableFootnoteLinks: true,
  openLinksInNewWindow: true,
  previewColorScheme: 'light',
} satisfies PreviewSignatureInput

const initialFilesState = useFilesStore.getState()
const initialPreviewState = usePreviewStore.getState()
const initialEditorState = useEditorStore.getState()

afterEach(() => {
  useFilesStore.setState(initialFilesState, true)
  usePreviewStore.setState(initialPreviewState, true)
  useEditorStore.setState(initialEditorState, true)
})

describe('预览输入签名', () => {
  it('相同输入始终生成相同签名', () => {
    expect(createPreviewSignature({ ...baseInput })).toBe(createPreviewSignature({ ...baseInput }))
  })

  it.each([
    ['文件', { contentFileId: 'file-2' }],
    ['正文', { currentContent: '# 新正文' }],
    ['宽度', { previewWidth: 768 }],
    ['Markdown 样式', { markdownStyle: 'bauhaus' }],
    ['代码样式', { codeTheme: 'github-dark' }],
    ['自定义样式', { customCss: 'p { color: red; }' }],
  ] satisfies Array<[string, Partial<PreviewSignatureInput>]>)('%s变化后签名不匹配', (_name, change) => {
    expect(createPreviewSignature({ ...baseInput, ...change })).not.toBe(createPreviewSignature(baseInput))
  })
})

describe('预览瞬时就绪判定', () => {
  function setReadyInput() {
    useFilesStore.setState({
      activeFileId: baseInput.contentFileId,
      contentFileId: baseInput.contentFileId,
      contentStatus: 'ready',
      currentContent: baseInput.currentContent,
    })
    usePreviewStore.setState({
      previewWidth: baseInput.previewWidth,
      markdownStyle: baseInput.markdownStyle,
      codeTheme: baseInput.codeTheme,
      mermaidTheme: baseInput.mermaidTheme,
      infographic: {
        theme: baseInput.infographicTheme,
        palette: baseInput.infographicPalette,
      },
      customCss: baseInput.customCss,
      previewColorScheme: baseInput.previewColorScheme,
      renderedSignature: createPreviewSignature(baseInput),
    })
    useEditorStore.setState({
      enableFootnoteLinks: baseInput.enableFootnoteLinks,
      openLinksInNewWindow: baseInput.openLinksInNewWindow,
    })
  }

  it('文件与已提交签名均匹配时就绪', () => {
    setReadyInput()
    expect(isPreviewReadyNow()).toBe(true)
  })

  it('执行瞬间正文变化时立即拒绝旧预览', () => {
    setReadyInput()
    useFilesStore.setState({ currentContent: '# 点击瞬间的新正文' })
    expect(isPreviewReadyNow()).toBe(false)
  })

  it('文件仍在加载时即使签名匹配也未就绪', () => {
    setReadyInput()
    useFilesStore.setState({ contentStatus: 'loading' })
    expect(isPreviewReadyNow()).toBe(false)
  })
})

describe('预览 Store', () => {
  it('不持久化已提交签名', () => {
    expect(partializePreviewState(usePreviewStore.getState())).not.toHaveProperty('renderedSignature')
  })
})
