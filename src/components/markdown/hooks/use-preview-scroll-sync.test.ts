// @vitest-environment jsdom
import type { Root } from 'react-dom/client'
import { act, createElement, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/stores/editor'
import { usePreviewScrollSync } from './use-preview-scroll-sync'

vi.mock('@codemirror/view', () => {
  throw new Error('预览滚动入口不应加载 CodeMirror')
})

const initialEditor = useEditorStore.getState()
let root: Root
let container: HTMLDivElement
let frame: HTMLIFrameElement
let scrollElement: HTMLElement
let controller: ReturnType<typeof usePreviewScrollSync>
let frames: Map<number, FrameRequestCallback>
let nextId: number

function Harness({ enabled = true }: { enabled?: boolean }) {
  const result = usePreviewScrollSync({ enabled })
  useEffect(() => {
    controller = result
  }, [result])
  return createElement('iframe', { ref: result.iframeRef, title: '测试预览' })
}

function flushFrames() {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach(callback => callback(0))
}

function scroll() {
  frame.contentWindow!.dispatchEvent(new Event('scroll'))
}

describe('预览滚动同步', () => {
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    frames = new Map()
    nextId = 0
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextId, callback)
      return nextId
    })
    const cancelFrame = vi.fn((id: number) => frames.delete(id))
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
    useEditorStore.setState({ scrollRatio: 0, scrollSource: null })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root.render(createElement(Harness)))
    frame = container.querySelector('iframe')!
    Object.defineProperties(frame.contentWindow, {
      requestAnimationFrame: { configurable: true, value: requestFrame },
      cancelAnimationFrame: { configurable: true, value: cancelFrame },
    })
    scrollElement = frame.contentDocument!.documentElement
    Object.defineProperties(scrollElement, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 200 },
    })
    await act(async () => controller.onIframeLoad())
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    useEditorStore.setState(initialEditor, true)
    vi.unstubAllGlobals()
  })

  it('预览滚动经 RAF 节流发送最新比例', () => {
    scrollElement.scrollTop = 100
    scroll()
    scrollElement.scrollTop = 400
    scroll()
    expect(frames.size).toBe(1)
    flushFrames()
    expect(useEditorStore.getState().scrollRatio).toBe(0.5)
    expect(useEditorStore.getState().scrollSource).toBe('preview')
  })

  it('编辑器滚动更新预览，锁定期间不回传', () => {
    useEditorStore.getState().setScrollFromEditor(0.5)
    expect(scrollElement.scrollTop).toBe(400)
    scroll()
    expect(frames.size).toBe(1)
    flushFrames()
    expect(useEditorStore.getState().scrollSource).toBe('editor')
    scroll()
    flushFrames()
    expect(useEditorStore.getState().scrollSource).toBe('preview')
  })

  it('禁用后既不发送也不跟随滚动', async () => {
    await act(async () => root.render(createElement(Harness, { enabled: false })))
    scroll()
    expect(frames.size).toBe(0)
    useEditorStore.getState().setScrollFromEditor(0.5)
    expect(scrollElement.scrollTop).toBe(0)
  })

  it('load 时恢复 Store 中的滚动比例', async () => {
    useEditorStore.setState({ scrollRatio: 0.25, scrollSource: null })
    await act(async () => controller.onIframeLoad())
    flushFrames()
    expect(scrollElement.scrollTop).toBe(200)
  })

  it('卸载时取消待回传 RAF，移除订阅和滚动监听', async () => {
    scrollElement.scrollTop = 600
    scroll()
    const oldWindow = frame.contentWindow!
    await act(async () => root.render(null))
    flushFrames()
    expect(useEditorStore.getState().scrollRatio).toBe(0)
    oldWindow.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(0)
    useEditorStore.getState().setScrollFromEditor(0.5)
    expect(scrollElement.scrollTop).toBe(600)
  })
})
