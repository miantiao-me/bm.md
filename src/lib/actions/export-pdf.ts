import { toast } from 'sonner'
import { logSafeError } from '@/lib/log-safe-error'
import { pdfErrorMessage, renderPdf, shouldPrintFallback } from '../pdf/browser'
import { replacementSummary } from '../pdf/fonts'
import { PdfError } from '../pdf/protocol'
import { createPdfSnapshot } from '../pdf/snapshot'
import { getPreviewIframe } from './preview'

let isExporting = false

export async function exportPdf(): Promise<void> {
  if (isExporting) {
    toast.info('正在导出中，请稍候…')
    return
  }

  const preview = getPreviewIframe()
  if (!preview)
    return
  if (!preview.content.textContent?.trim() && !preview.content.querySelector('img, svg')) {
    toast.error('没有可导出的内容')
    return
  }

  isExporting = true
  const loadingToast = toast.loading('正在生成 PDF…')
  try {
    const [result, { default: fileSaver }] = await Promise.all([
      createPdfSnapshot(preview.content).then(renderPdf),
      import('file-saver'),
    ])
    fileSaver.saveAs(new Blob([result.pdf], { type: 'application/pdf' }), 'bm.md.pdf')
    if (result.replacements.length > 0) {
      toast.warning('PDF 已导出，部分不支持字符已替换为 □', {
        id: loadingToast,
        description: replacementSummary(result.replacements),
      })
    }
    else {
      toast.success('已导出 PDF', { id: loadingToast })
    }
  }
  catch (error) {
    logSafeError('PDF 导出失败', error)
    if (shouldPrintFallback(error)) {
      toast.warning(pdfErrorMessage(error.kind), {
        id: loadingToast,
        description: navigator.onLine ? undefined : '当前离线，所需字体可能尚未缓存',
      })
      printPreview()
      return
    }
    toast.error('导出 PDF 失败', {
      id: loadingToast,
      description: error instanceof PdfError ? error.message : '请重试或使用打印功能',
    })
  }
  finally {
    isExporting = false
  }
}

export function printPreview(): void {
  const preview = getPreviewIframe()
  if (!preview)
    return
  try {
    const contentWindow = preview.iframe.contentWindow
    if (!contentWindow) {
      toast.error('无法访问预览窗口')
      return
    }
    contentWindow.print()
  }
  catch (error) {
    logSafeError('预览打印失败', error)
    toast.error('打印失败，请重试')
  }
}
