import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { EditorView as EditorViewClass } from '@codemirror/view'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editor'

function getScrollRatio(element: HTMLElement): number {
  const maxScrollTop = element.scrollHeight - element.clientHeight
  if (maxScrollTop <= 0) {
    return 0
  }

  return element.scrollTop / maxScrollTop
}

function setScrollRatio(element: HTMLElement, ratio: number): void {
  const maxScrollTop = element.scrollHeight - element.clientHeight
  element.scrollTop = maxScrollTop * ratio
}

function getIframeScrollElement(iframe: HTMLIFrameElement | null): HTMLElement | null {
  const document = iframe?.contentDocument
  return (document?.scrollingElement || document?.documentElement) as HTMLElement | null
}

// 使用普通对象存储滚动状态，避免 React Compiler 限制
interface ScrollState {
  rafId: number | null
  locked: boolean
  enabled: boolean
  onScrollRatioChange: (ratio: number) => void
}

const editorScrollStates = new WeakMap<EditorView, ScrollState>()
const previewScrollStates = new WeakMap<HTMLIFrameElement, ScrollState>()

function getEditorScrollState(view: EditorView, onScrollRatioChange: (ratio: number) => void, enabled: boolean): ScrollState {
  let state = editorScrollStates.get(view)
  if (!state) {
    state = { rafId: null, locked: false, enabled, onScrollRatioChange }
    editorScrollStates.set(view, state)
  }
  return state
}

function getPreviewScrollState(iframe: HTMLIFrameElement, onScrollRatioChange: (ratio: number) => void, enabled: boolean): ScrollState {
  let state = previewScrollStates.get(iframe)
  if (!state) {
    state = { rafId: null, locked: false, enabled, onScrollRatioChange }
    previewScrollStates.set(iframe, state)
  }
  return state
}

interface EditorScrollSyncOptions {
  enabled?: boolean
}

export function useEditorScrollSync(options: EditorScrollSyncOptions = {}): {
  editorExtensions: Extension[]
  onCreateEditor: (view: EditorView) => void
} {
  const editorViewRef = useRef<EditorView | null>(null)
  const { enabled = true } = options

  useEffect(() => {
    const view = editorViewRef.current
    if (view) {
      const state = editorScrollStates.get(view)
      if (state) {
        state.enabled = enabled
      }
    }
  }, [enabled])

  const editorExtensions = useMemo<Extension[]>(() => [
    EditorViewClass.domEventHandlers({
      scroll: (_event: Event, view: EditorView) => {
        const state = editorScrollStates.get(view)
        if (!state || !state.enabled || state.locked) {
          return
        }

        // RAF 节流
        if (state.rafId !== null) {
          return
        }

        state.rafId = requestAnimationFrame(() => {
          state.rafId = null
          const ratio = getScrollRatio(view.scrollDOM)
          useEditorStore.getState().setScrollFromEditor(ratio)
        })
      },
    }),
  ], [])

  const onCreateEditor = (view: EditorView) => {
    editorViewRef.current = view
    const { setScrollFromEditor } = useEditorStore.getState()
    getEditorScrollState(view, setScrollFromEditor, enabled)
  }

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const view = editorViewRef.current
      if (!view) {
        return
      }

      const scrollState = editorScrollStates.get(view)
      if (!scrollState || !scrollState.enabled) {
        return
      }

      if (state.scrollSource !== 'preview' || state.scrollRatio === prevState.scrollRatio) {
        return
      }

      const scrollElement = view.scrollDOM
      if (!scrollElement) {
        return
      }

      scrollState.locked = true
      setScrollRatio(scrollElement, state.scrollRatio)
      requestAnimationFrame(() => {
        scrollState.locked = false
      })
    })

    return unsubscribe
  }, [])

  return { editorExtensions, onCreateEditor }
}

interface PreviewScrollSyncOptions {
  enabled?: boolean
}

export function usePreviewScrollSync(options: PreviewScrollSyncOptions = {}): {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onIframeLoad: () => void
} {
  const { enabled = true } = options
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeReady, setIframeReady] = useState(0)

  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe) {
      const state = previewScrollStates.get(iframe)
      if (state) {
        state.enabled = enabled
      }
    }
  }, [enabled])

  const onIframeLoad = () => {
    const iframe = iframeRef.current
    if (iframe) {
      const { setScrollFromPreview, scrollRatio } = useEditorStore.getState()
      getPreviewScrollState(iframe, setScrollFromPreview, enabled)

      const element = getIframeScrollElement(iframe)
      if (element && scrollRatio > 0) {
        requestAnimationFrame(() => {
          setScrollRatio(element, scrollRatio)
        })
      }
    }
    setIframeReady(value => value + 1)
  }

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const iframe = iframeRef.current
      const scrollState = iframe ? previewScrollStates.get(iframe) : null
      if (!scrollState || !scrollState.enabled) {
        return
      }

      if (state.scrollSource !== 'editor' || state.scrollRatio === prevState.scrollRatio) {
        return
      }

      const element = getIframeScrollElement(iframe)
      const contentWindow = iframe?.contentWindow
      if (!element || !contentWindow) {
        return
      }

      scrollState.locked = true
      setScrollRatio(element, state.scrollRatio)
      contentWindow.requestAnimationFrame(() => {
        scrollState.locked = false
      })
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    const contentWindow = iframe?.contentWindow
    const scrollElement = getIframeScrollElement(iframe)
    const state = iframe ? previewScrollStates.get(iframe) : null
    if (!contentWindow || !scrollElement || !state) {
      return
    }

    const onScroll = () => {
      if (!state.enabled || state.locked) {
        return
      }

      // RAF 节流
      if (state.rafId !== null) {
        return
      }

      state.rafId = contentWindow.requestAnimationFrame(() => {
        state.rafId = null
        useEditorStore.getState().setScrollFromPreview(getScrollRatio(scrollElement))
      })
    }

    contentWindow.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      contentWindow.removeEventListener('scroll', onScroll)
      if (state.rafId !== null) {
        try {
          contentWindow.cancelAnimationFrame(state.rafId)
        }
        catch {
          // iframe 可能已卸载，忽略错误
        }
        state.rafId = null
      }
    }
  }, [iframeReady])

  return { iframeRef, onIframeLoad }
}
