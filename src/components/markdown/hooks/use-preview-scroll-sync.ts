import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editor'
import { getScrollRatio, getScrollTop } from './scroll-ratio'

function getIframeScrollElement(iframe: HTMLIFrameElement | null): HTMLElement | null {
  const document = iframe?.contentDocument
  return (document?.scrollingElement || document?.documentElement) as HTMLElement | null
}

// 使用普通对象存储滚动状态，避免 React Compiler 限制
interface ScrollState {
  rafId: number | null
  locked: boolean
  enabled: boolean
}

const previewScrollStates = new WeakMap<HTMLIFrameElement, ScrollState>()

function getPreviewScrollState(iframe: HTMLIFrameElement, enabled: boolean): ScrollState {
  let state = previewScrollStates.get(iframe)
  if (!state) {
    state = { rafId: null, locked: false, enabled }
    previewScrollStates.set(iframe, state)
  }
  return state
}

interface PreviewScrollSyncOptions {
  enabled?: boolean
}

export function usePreviewScrollSync(options: PreviewScrollSyncOptions = {}): {
  iframeRef: RefObject<HTMLIFrameElement | null>
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
      const { scrollRatio } = useEditorStore.getState()
      getPreviewScrollState(iframe, enabled)

      const element = getIframeScrollElement(iframe)
      if (element && scrollRatio > 0) {
        requestAnimationFrame(() => {
          element.scrollTop = getScrollTop(element, scrollRatio)
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
      element.scrollTop = getScrollTop(element, state.scrollRatio)
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
