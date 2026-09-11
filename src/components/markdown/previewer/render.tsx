import { Phone } from '@/components/mockups/iphone'
import { Safari } from '@/components/mockups/safari'
import { PREVIEW_WIDTH_MOBILE } from '@/stores/preview'
import iframeShell from './iframe-shell.html?raw'
import { usePreviewController } from './use-preview-controller'

export default function MarkdownRender() {
  const { iframeKey, iframeRef, onIframeLoad, previewWidth } = usePreviewController()
  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      key={iframeKey}
      ref={iframeRef}
      id="bm-preview-iframe"
      title="Markdown 预览"
      className="size-full border-0"
      sandbox="allow-same-origin allow-modals"
      srcDoc={iframeShell}
      onLoad={onIframeLoad}
    />
  )

  if (isMobile) {
    return (
      <Phone>
        {iframeContent}
      </Phone>
    )
  }

  return (
    <Safari
      className="size-full"
      style={{ maxWidth: previewWidth }}
      url="bm.md"
      mode="simple"
    >
      {iframeContent}
    </Safari>
  )
}
