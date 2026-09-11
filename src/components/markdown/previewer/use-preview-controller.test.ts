// @vitest-environment jsdom
import type { Root } from 'react-dom/client'
import type { RenderedPreview } from './iframe-sync'
import { act, createElement, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { PREVIEW_WIDTH_DESKTOP, PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { isPreviewReadyNow } from './preview-ready'
import { usePreviewController } from './use-preview-controller'

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  sync: vi.fn(),
  scrollLoad: vi.fn(),
}))

vi.mock('@/lib/markdown/client-render', () => ({ renderMarkdownPreview: mocks.render }))
vi.mock('./iframe-sync', () => ({ syncIframeContent: mocks.sync }))
vi.mock('@/components/markdown/hooks/use-preview-scroll-sync', async () => {
  const { useRef } = await import('react')
  return {
    usePreviewScrollSync: () => ({
      iframeRef: useRef<HTMLIFrameElement | null>(null),
      onIframeLoad: mocks.scrollLoad,
    }),
  }
})

const initialFiles = useFilesStore.getState()
const initialPreview = usePreviewStore.getState()
const initialEditor = useEditorStore.getState()
let root: Root
let container: HTMLDivElement
let controller: ReturnType<typeof usePreviewController>

function Harness() {
  const result = usePreviewController()
  useEffect(() => {
    controller = result
  }, [result])
  return createElement('iframe', {
    key: result.iframeKey,
    ref: result.iframeRef,
    onLoad: result.onIframeLoad,
    title: '测试预览',
  })
}

function deferred() {
  let resolve!: (value: { html: string, css: string }) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<{ html: string, css: string }>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function mount() {
  await act(async () => root.render(createElement(Harness)))
  await act(async () => {
    container.querySelector('iframe')!.dispatchEvent(new Event('load'))
  })
}

async function startRender() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100)
  })
}

describe('预览 controller 调度与 frame 协调', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.sync.mockImplementation((_iframe, _preview, pending) => {
      pending.current = null
      return true
    })
    useFilesStore.setState({ activeFileId: 'A', contentFileId: 'A', contentStatus: 'ready', currentContent: '相同正文' })
    usePreviewStore.setState({ hasHydrated: true, renderedSignature: null })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    useFilesStore.setState(initialFiles, true)
    usePreviewStore.setState(initialPreview, true)
    useEditorStore.setState(initialEditor, true)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('较旧请求晚返回时不覆盖新正文和 ready 签名', async () => {
    const old = deferred()
    const latest = deferred()
    mocks.render.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await mount()
    await startRender()
    await act(async () => useFilesStore.setState({ currentContent: '新正文' }))
    await startRender()
    await act(async () => latest.resolve({ html: '<p>新正文</p>', css: '新样式' }))
    const signature = usePreviewStore.getState().renderedSignature
    expect(isPreviewReadyNow()).toBe(true)
    const count = mocks.sync.mock.calls.length
    await act(async () => old.resolve({ html: '<p>旧正文</p>', css: '旧样式' }))
    expect(mocks.sync).toHaveBeenCalledTimes(count)
    expect(usePreviewStore.getState().renderedSignature).toBe(signature)
    expect(mocks.sync.mock.lastCall?.[1]).toMatchObject({ html: '<p>新正文</p>' })
  })

  it('同正文切换文件时更换 frame，拒绝旧 load 和旧请求结果', async () => {
    const old = deferred()
    const latest = deferred()
    mocks.render.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await mount()
    await startRender()
    const oldFrame = container.querySelector('iframe')!
    const oldLoad = controller.onIframeLoad
    await act(async () => useFilesStore.setState({ activeFileId: 'B', contentFileId: 'B' }))
    const newFrame = container.querySelector('iframe')!
    expect(newFrame).not.toBe(oldFrame)
    expect(isPreviewReadyNow()).toBe(false)
    const scrollLoads = mocks.scrollLoad.mock.calls.length
    await act(async () => oldLoad({ currentTarget: oldFrame } as Parameters<typeof oldLoad>[0]))
    expect(mocks.scrollLoad).toHaveBeenCalledTimes(scrollLoads)
    await startRender()
    await act(async () => {
      newFrame.dispatchEvent(new Event('load'))
    })
    await act(async () => latest.resolve({ html: '<p>B</p>', css: '' }))
    expect(isPreviewReadyNow()).toBe(true)
    const count = mocks.sync.mock.calls.length
    await act(async () => old.resolve({ html: '<p>A</p>', css: '' }))
    expect(mocks.sync).toHaveBeenCalledTimes(count)
    expect(mocks.sync.mock.lastCall?.[0]).toBe(newFrame)
    expect(mocks.sync.mock.lastCall?.[1]).toMatchObject({ html: '<p>B</p>' })
  })

  it('错误 HTML 转义特殊字符、保留上次 CSS，但不标记 ready', async () => {
    const success = deferred()
    const failure = deferred()
    mocks.render.mockReturnValueOnce(success.promise).mockReturnValueOnce(failure.promise)
    await mount()
    await startRender()
    await act(async () => success.resolve({ html: '<p>正文</p>', css: '保留样式' }))
    await act(async () => useFilesStore.setState({ currentContent: '错误正文' }))
    expect(isPreviewReadyNow()).toBe(false)
    await startRender()
    await act(async () => failure.reject(new Error('<script>"\'&')))
    expect(mocks.sync.mock.lastCall?.[1] as RenderedPreview).toMatchObject({
      html: '<section id="bm-md">&lt;script&gt;&quot;&#39;&amp;</section>',
      css: '保留样式',
      commitReady: false,
    })
    expect(usePreviewStore.getState().renderedSignature).toBeNull()
    expect(isPreviewReadyNow()).toBe(false)
  })

  it('卸载时取消尚未开始的渲染', async () => {
    await mount()
    await act(async () => root.render(null))
    await startRender()
    expect(mocks.render).not.toHaveBeenCalled()
  })

  it('显式切换宽度时重建 frame，并拒绝此前已就绪的签名', async () => {
    usePreviewStore.setState({ previewWidth: PREVIEW_WIDTH_MOBILE })
    mocks.render.mockResolvedValue({ html: '<p>正文</p>', css: '' })
    await mount()
    await startRender()
    expect(isPreviewReadyNow()).toBe(true)
    const oldFrame = container.querySelector('iframe')!
    await act(async () => usePreviewStore.setState({ previewWidth: PREVIEW_WIDTH_DESKTOP }))
    expect(container.querySelector('iframe')).not.toBe(oldFrame)
    expect(isPreviewReadyNow()).toBe(false)
    expect(usePreviewStore.getState().renderedSignature).toBeNull()
  })

  it.each(['成功', '失败'])('请求已开始后卸载，%s返回时不再同步或提交签名', async (result) => {
    const pending = deferred()
    mocks.render.mockReturnValueOnce(pending.promise)
    await mount()
    await startRender()
    expect(mocks.render).toHaveBeenCalledTimes(1)
    await act(async () => root.render(null))
    const syncCount = mocks.sync.mock.calls.length
    const signatures: Array<string | null> = []
    const unsubscribe = usePreviewStore.subscribe(state => signatures.push(state.renderedSignature))
    try {
      await act(async () => {
        if (result === '成功') {
          pending.resolve({ html: '<p>已卸载</p>', css: '' })
        }
        else {
          pending.reject(new Error('已卸载'))
        }
      })
      expect(mocks.sync).toHaveBeenCalledTimes(syncCount)
      expect(signatures).toEqual([])
      expect(usePreviewStore.getState().renderedSignature).toBeNull()
    }
    finally {
      unsubscribe()
    }
  })
})
