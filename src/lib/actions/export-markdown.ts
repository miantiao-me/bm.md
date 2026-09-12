import { toast } from 'sonner'
import { saveBlob } from '@/lib/download'
import { useFilesStore } from '@/stores/files'

export function exportMarkdown(content: string, fileName?: string) {
  if (!content.trim()) {
    toast.error('没有可导出的内容')
    return
  }

  const activeFile = useFilesStore.getState().getActiveFile()
  const exportFileName = fileName ?? activeFile?.name ?? 'bm.md'

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  saveBlob(blob, exportFileName)
  toast.success('已导出 Markdown 文件')
}
