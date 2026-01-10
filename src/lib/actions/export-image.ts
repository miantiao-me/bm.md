import type { CaptureResult } from '@zumer/snapdom'
import { toast } from 'sonner'

function getPreviewElement(): HTMLElement | null {
  try {
    const iframe = document.querySelector('#bm-preview-iframe') as HTMLIFrameElement | null
    if (!iframe?.contentDocument?.body) {
      toast.error('预览区域尚未就绪')
      return null
    }

    const previewContent = iframe.contentDocument.getElementById('bm-md')
    if (!previewContent) {
      toast.error('没有可操作的内容')
      return null
    }

    return previewContent
  }
  catch {
    toast.error('无法访问预览内容')
    return null
  }
}

async function createPreviewSnapshot(): Promise<CaptureResult | null> {
  const previewContent = getPreviewElement()
  if (!previewContent)
    return null

  const { snapdom } = await import('@zumer/snapdom')
  return snapdom(previewContent)
}

export async function exportImage() {
  try {
    const snapshot = await createPreviewSnapshot()
    if (!snapshot)
      return

    await snapshot.download({ filename: 'bm.md.jpg', quality: 0.99 })
    toast.success('已导出图片')
  }
  catch (error) {
    toast.error('导出图片失败')
    console.error(error)
  }
}

export async function copyImage() {
  try {
    const snapshot = await createPreviewSnapshot()
    if (!snapshot)
      return

    const { copyBlobToClipboard } = await import('copy-image-clipboard')
    const blob = await snapshot.toBlob({ type: 'png' })
    await copyBlobToClipboard(blob)
    toast.success('已复制图片到剪贴板')
  }
  catch (error) {
    toast.error('复制图片失败')
    console.error(error)
  }
}
