import type { RefObject, SyntheticEvent } from 'react'
import type { RenderedPreview } from './iframe-sync'
import { debounce, escape } from 'es-toolkit'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePreviewScrollSync } from '@/components/markdown/hooks/use-preview-scroll-sync'
import { renderMarkdownPreview } from '@/lib/markdown/client-render'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'
import { getReadySignature, PreviewFrameLifecycle } from './frame-lifecycle'
import { syncIframeContent } from './iframe-sync'
import { createPreviewSignature, isPreviewSignatureCurrent } from './preview-ready'

const RENDER_DEBOUNCE_MS = 100

function createErrorHtml(message: string): string {
  return `<section id="bm-md">${escape(message)}</section>`
}

function submitPreview(
  iframe: HTMLIFrameElement | null,
  preview: RenderedPreview,
  renderedPreviewRef: RefObject<RenderedPreview | null>,
  pendingPreviewRef: RefObject<RenderedPreview | null>,
  lifecycle: PreviewFrameLifecycle,
): void {
  renderedPreviewRef.current = preview
  if (!iframe || !lifecycle.canSync(iframe)) {
    pendingPreviewRef.current = preview
    return
  }

  if (syncIframeContent(iframe, preview, pendingPreviewRef)) {
    lifecycle.markSynced(iframe, getReadySignature(
      preview.signature,
      preview.commitReady,
      isPreviewSignatureCurrent(preview.signature),
    ))
  }
}

export function usePreviewController() {
  const content = useFilesStore(state => state.currentContent)
  const contentFileId = useFilesStore(state => state.contentFileId)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const breaks = useEditorStore(state => state.breaks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const hasHydrated = usePreviewStore(state => state.hasHydrated)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const customCss = usePreviewStore(state => state.customCss)
  const previewColorScheme = usePreviewStore(state => state.previewColorScheme)
  const setRenderedSignature = usePreviewStore(state => state.setRenderedSignature)
  const [iframeDocument, setIframeDocument] = useState<Document | null>(null)

  const { iframeRef, onIframeLoad: onScrollSyncLoad } = usePreviewScrollSync({
    enabled: enableScrollSync,
  })

  const pendingPreviewRef = useRef<RenderedPreview | null>(null)
  const renderedPreviewRef = useRef<RenderedPreview | null>(null)
  const previewCssRef = useRef('')
  const [frameLifecycle] = useState(() => new PreviewFrameLifecycle(setRenderedSignature))
  const iframeKey = `${contentFileId ?? 'none'}:${previewWidth}`

  const onIframeLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const loadedIframe = event.currentTarget
    if (loadedIframe !== iframeRef.current || !frameLifecycle.markLoaded(loadedIframe)) {
      return
    }
    onScrollSyncLoad()

    const preview = pendingPreviewRef.current ?? renderedPreviewRef.current
    if (preview) {
      submitPreview(
        loadedIframe,
        preview,
        renderedPreviewRef,
        pendingPreviewRef,
        frameLifecycle,
      )
    }

    const iframeDoc = loadedIframe.contentDocument
    if (iframeDoc) {
      setIframeDocument(iframeDoc)
    }
  }

  useLayoutEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) {
      return
    }
    frameLifecycle.reset(iframe)

    return () => {
      frameLifecycle.dispose(iframe)
    }
  }, [iframeKey, iframeRef, frameLifecycle])

  useEffect(() => {
    if (!iframeDocument) {
      return
    }
    const iframeDoc = iframeDocument

    function handleIframeClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a')
      if (!link)
        return

      const href = link.getAttribute('href')
      if (!href)
        return

      e.preventDefault()

      // 页内锚点跳转（脚注引用、返回链接等）
      if (href.startsWith('#')) {
        let targetHref = href
        if (href.includes('-fnref-')) {
          targetHref = href.replace('-fnref-', '-fn-')
        }
        else if (href.includes('-fn-')) {
          targetHref = href.replace('-fn-', '-fnref-')
        }
        const target = iframeDoc.querySelector(`[href="${CSS.escape(targetHref)}"]`)
        if (target) {
          target.scrollIntoView({ behavior: 'auto' })
        }
        return
      }

      // 外部链接 - 顶层窗口新开标签页
      window.open(href, '_blank', 'noopener')
    }

    iframeDoc.addEventListener('click', handleIframeClick)
    return () => iframeDoc.removeEventListener('click', handleIframeClick)
  }, [iframeDocument])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    let canceled = false
    pendingPreviewRef.current = null
    const signature = createPreviewSignature({
      contentFileId,
      currentContent: content,
      previewWidth,
      markdownStyle,
      codeTheme,
      mermaidTheme,
      infographicTheme: infographic.theme,
      infographicPalette: infographic.palette,
      customCss,
      enableFootnoteLinks,
      breaks,
      openLinksInNewWindow,
      previewColorScheme,
    })
    const scheduleRender = debounce(async () => {
      try {
        const result = await renderMarkdownPreview({
          content,
          markdownStyle,
          codeTheme,
          mermaidTheme,
          infographicTheme: infographic.theme,
          infographicPalette: infographic.palette,
          customCss,
          enableFootnoteLinks,
          breaks,
          openLinksInNewWindow,
          colorScheme: previewColorScheme,
        })

        if (!canceled) {
          previewCssRef.current = result.css
          submitPreview(
            iframeRef.current,
            {
              html: result.html,
              css: result.css,
              colorScheme: previewColorScheme,
              signature,
              commitReady: true,
            },
            renderedPreviewRef,
            pendingPreviewRef,
            frameLifecycle,
          )
        }
      }
      catch (error) {
        if (!canceled) {
          const message = error instanceof Error ? error.message : '转换失败'
          submitPreview(
            iframeRef.current,
            {
              html: createErrorHtml(message),
              css: previewCssRef.current,
              colorScheme: previewColorScheme,
              signature,
              commitReady: false,
            },
            renderedPreviewRef,
            pendingPreviewRef,
            frameLifecycle,
          )
        }
      }
    }, RENDER_DEBOUNCE_MS)

    scheduleRender()

    return () => {
      canceled = true
      scheduleRender.cancel()
    }
  }, [hasHydrated, contentFileId, content, previewWidth, markdownStyle, codeTheme, mermaidTheme, infographic, customCss, enableFootnoteLinks, breaks, openLinksInNewWindow, previewColorScheme, iframeRef, frameLifecycle])

  return { iframeKey, iframeRef, onIframeLoad, previewWidth }
}
