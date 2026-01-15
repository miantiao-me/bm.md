import { toast } from 'sonner'

export function exportPdf() {
  try {
    const iframe = document.querySelector('#bm-preview-iframe') as HTMLIFrameElement | null
    if (!iframe?.contentDocument?.body) {
      toast.error('预览区域尚未就绪')
      return
    }

    const content = iframe.contentDocument.body.innerHTML
    if (!content.trim()) {
      toast.error('没有可打印的内容')
      return
    }

    // 收集 iframe 中的所有样式
    const styles: string[] = []
    const iframeDoc = iframe.contentDocument

    iframeDoc.querySelectorAll('style').forEach((style) => {
      styles.push(style.innerHTML)
    })

    // 收集 <link rel="stylesheet"> 的 href
    const linkStyles: string[] = []
    iframeDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href')
      if (href) {
        linkStyles.push(`<link rel="stylesheet" href="${href}">`)
      }
    })

    // 打印专用样式
    const printStyles = `
      @media print {
        @page { 
          margin: 1.5cm; 
          size: A4;
        }
        body { 
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important;
          margin: 0;
          padding: 0;
        }
        #bm-md {
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        pre, blockquote, table, figure { 
          break-inside: avoid; 
          page-break-inside: avoid;
        }
        pre code {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
        }
        .no-print { display: none !important; }
      }
    `

    // 创建打印窗口
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器是否阻止弹窗')
      return
    }

    // 构建打印页面 HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>打印预览 - bm.md</title>
          ${linkStyles.join('\n')}
          <style>${styles.join('\n')}</style>
          <style>${printStyles}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()

    // 等待内容加载完成后打印
    let hasPrinted = false

    const doPrint = () => {
      if (hasPrinted || printWindow.closed)
        return
      hasPrinted = true
      printWindow.focus()
      printWindow.print()
    }

    printWindow.onload = doPrint

    // 备用：如果 onload 不触发（某些浏览器），延迟打印
    setTimeout(() => {
      doPrint()
    }, 300)

    // 打印完成后关闭窗口
    printWindow.onafterprint = () => {
      printWindow.close()
    }
  }
  catch (error) {
    toast.error('打印失败')
    console.error('Print error:', error)
  }
}
