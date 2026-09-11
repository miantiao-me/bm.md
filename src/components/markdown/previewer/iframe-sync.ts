import type { RefObject } from 'react'
import morphdom from 'morphdom'
import { applyDarkModeToPreviewHtml } from './darkmode'

const PREVIEW_STYLE_ID = 'bm-preview-style'

export interface RenderedPreview {
  html: string
  css: string
  colorScheme: string
  signature: string
  commitReady: boolean
}

function createPreviewBody(previewHtml: string): HTMLBodyElement {
  const wrapper = document.createElement('body')
  const template = document.createElement('template')
  template.innerHTML = previewHtml
  wrapper.append(template.content)
  return wrapper
}

function applyIframeStyle(iframe: HTMLIFrameElement | null, css: string): boolean {
  const iframeDoc = iframe?.contentDocument
  const head = iframeDoc?.head

  if (!head) {
    return false
  }

  let style = head.querySelector<HTMLStyleElement>(`#${PREVIEW_STYLE_ID}`)
  if (!style) {
    style = iframeDoc.createElement('style')
    style.id = PREVIEW_STYLE_ID
    head.append(style)
  }

  style.textContent = css
  return true
}

function applyIframeContent(iframe: HTMLIFrameElement | null, preview: RenderedPreview): boolean {
  const body = iframe?.contentDocument?.body

  if (!body || !applyIframeStyle(iframe, preview.css)) {
    return false
  }

  const wrapper = createPreviewBody(preview.colorScheme === 'dark'
    ? applyDarkModeToPreviewHtml(preview.html)
    : preview.html)

  body.style.backgroundColor = preview.colorScheme === 'dark' ? '#111111' : ''
  body.style.colorScheme = preview.colorScheme

  morphdom(body, wrapper, {
    childrenOnly: true,
    onBeforeElUpdated(fromEl, toEl) {
      return !fromEl.isEqualNode(toEl)
    },
  })

  return true
}

export function syncIframeContent(
  iframe: HTMLIFrameElement | null,
  preview: RenderedPreview,
  pendingPreviewRef: RefObject<RenderedPreview | null>,
): boolean {
  try {
    if (!applyIframeContent(iframe, preview)) {
      pendingPreviewRef.current = preview
      return false
    }
  }
  catch {
    pendingPreviewRef.current = preview
    return false
  }

  pendingPreviewRef.current = null
  return true
}
