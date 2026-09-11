import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { EditorView as EditorViewClass } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editor'
import { getScrollRatio, getScrollTop } from './scroll-ratio'

// 使用普通对象存储滚动状态，避免 React Compiler 限制
interface ScrollState {
  rafId: number | null
  locked: boolean
  enabled: boolean
}

const editorScrollStates = new WeakMap<EditorView, ScrollState>()

function getEditorScrollState(view: EditorView, enabled: boolean): ScrollState {
  let state = editorScrollStates.get(view)
  if (!state) {
    state = { rafId: null, locked: false, enabled }
    editorScrollStates.set(view, state)
  }
  return state
}

function disposeEditorScrollState(view: EditorView | null): void {
  if (!view)
    return

  const state = editorScrollStates.get(view)
  if (state?.rafId != null) {
    cancelAnimationFrame(state.rafId)
  }
  editorScrollStates.delete(view)
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

  const editorExtensions: Extension[] = [
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
  ]

  const onCreateEditor = (view: EditorView) => {
    if (editorViewRef.current !== view) {
      disposeEditorScrollState(editorViewRef.current)
    }
    editorViewRef.current = view
    getEditorScrollState(view, enabled)
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
      scrollElement.scrollTop = getScrollTop(scrollElement, state.scrollRatio)
      requestAnimationFrame(() => {
        scrollState.locked = false
      })
    })

    return () => {
      unsubscribe()
      disposeEditorScrollState(editorViewRef.current)
      editorViewRef.current = null
    }
  }, [])

  return { editorExtensions, onCreateEditor }
}
