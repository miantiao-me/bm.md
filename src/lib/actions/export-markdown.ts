import fileSaver from 'file-saver'
import { toast } from 'sonner'

const { saveAs } = fileSaver

export function exportMarkdown(content: string) {
  if (!content.trim()) {
    toast.error('没有可导出的内容')
    return
  }

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, 'bm.md')
  toast.success('已导出 Markdown 文件')
}
