// @vitest-environment jsdom
import type { EditorView } from '@codemirror/view'
import type { Root } from 'react-dom/client'
import { act, createElement, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/stores/editor'
import { useEditorScrollSync } from './use-editor-scroll-sync'

const mocks = vi.hoisted(() => ({ handlers: vi.fn() }))
vi.mock('@codemirror/view', () => ({
  EditorView: { domEventHandlers: mocks.handlers },
}))

const initialEditor = useEditorStore.getState()
let root: Root
let container: HTMLDivElement
let controller: ReturnType<typeof useEditorScrollSync>
let frames: Map<number, FrameRequestCallback>
let nextId: number

function Harness({ enabled = true }: { enabled?: boolean }) {
  const result = useEditorScrollSync({ enabled })
  useEffect(() => {
    controller = result
  }, [result])
  return null
}

function createView(scrollTop: number): EditorView {
  return { scrollDOM: { scrollHeight: 1000, clientHeight: 200, scrollTop } } as EditorView
}

function scroll(view: EditorView) {
  mocks.handlers.mock.lastCall![0].scroll(new Event('scroll'), view)
}

function flushFrames() {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach(callback => callback(0))
}

describe('编辑器滚动同步生命周期', () => {
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    frames = new Map()
    nextId = 0
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextId, callback)
      return nextId
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
    mocks.handlers.mockReset().mockReturnValue([])
    useEditorStore.setState({ scrollRatio: 0, scrollSource: null })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => root.render(createElement(Harness)))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    useEditorStore.setState(initialEditor, true)
    vi.unstubAllGlobals()
  })

  it('旧 view 排队的 RAF 在切换 view 后不能更新新文件的滚动状态', () => {
    const oldView = createView(600)
    controller.onCreateEditor(oldView)
    scroll(oldView)
    controller.onCreateEditor(createView(0))
    flushFrames()
    expect(useEditorStore.getState().scrollRatio).toBe(0)
    expect(useEditorStore.getState().scrollSource).toBeNull()
    scroll(oldView)
    expect(frames.size).toBe(0)
  })

  it('卸载后旧 view 的 RAF 不能污染下一文件', async () => {
    const oldView = createView(600)
    controller.onCreateEditor(oldView)
    scroll(oldView)
    await act(async () => root.render(null))
    await act(async () => root.render(createElement(Harness)))
    controller.onCreateEditor(createView(0))
    flushFrames()
    expect(useEditorStore.getState().scrollRatio).toBe(0)
    expect(useEditorStore.getState().scrollSource).toBeNull()
  })

  it('保留 RAF 节流并读取执行瞬间的比例', () => {
    const view = createView(100)
    controller.onCreateEditor(view)
    scroll(view)
    view.scrollDOM.scrollTop = 400
    scroll(view)
    expect(frames.size).toBe(1)
    flushFrames()
    expect(useEditorStore.getState().scrollRatio).toBe(0.5)
    expect(useEditorStore.getState().scrollSource).toBe('editor')
  })

  it('旧 view 的解锁 RAF 不会提前解除新 view 的反馈锁', () => {
    controller.onCreateEditor(createView(0))
    useEditorStore.getState().setScrollFromPreview(0.25)
    const [oldId, oldUnlock] = frames.entries().next().value!
    const newView = createView(0)
    controller.onCreateEditor(newView)
    useEditorStore.getState().setScrollFromPreview(0.5)
    frames.delete(oldId)
    oldUnlock(0)
    scroll(newView)
    expect(frames.size).toBe(1)
    expect(useEditorStore.getState().scrollSource).toBe('preview')
    flushFrames()
    scroll(newView)
    flushFrames()
    expect(useEditorStore.getState().scrollSource).toBe('editor')
  })

  it('禁用时不发送滚动，预览滚动仅在解锁后允许回传', async () => {
    const view = createView(0)
    controller.onCreateEditor(view)
    await act(async () => root.render(createElement(Harness, { enabled: false })))
    scroll(view)
    expect(frames.size).toBe(0)
    await act(async () => root.render(createElement(Harness, { enabled: true })))
    useEditorStore.getState().setScrollFromPreview(0.5)
    expect(view.scrollDOM.scrollTop).toBe(400)
    scroll(view)
    expect(frames.size).toBe(1)
    flushFrames()
    scroll(view)
    flushFrames()
    expect(useEditorStore.getState().scrollSource).toBe('editor')
  })
})
