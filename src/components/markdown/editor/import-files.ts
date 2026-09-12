import type { EditorView } from '@codemirror/view'
import { toast } from 'sonner'
import { DocumentImportError, getDocumentImportErrorMessage } from '@/lib/document/error'
import { classifyFile, parseFileToMarkdown } from '@/lib/file-importer'
import { prepareImageImport } from '@/lib/image-import'
import { useEditorStore } from '@/stores/editor'
import { AsyncImportTarget, IMPORT_CANCELLED_MESSAGE } from './async-import-target'

function completeBlockSeparator(content: string): string {
  if (content.endsWith('\n\n')) {
    return ''
  }
  return content.endsWith('\n') ? '\n' : '\n\n'
}

export async function importFilesToEditor(
  view: EditorView,
  files: File[],
  insertPos: number,
): Promise<void> {
  const target = new AsyncImportTarget(view, insertPos)
  const { enableImageOcr, enableEnhancedImageOcr } = useEditorStore.getState()
  let lastInserted: 'text' | 'image' | null = null
  let lastTextContent = ''

  try {
    for (const file of files) {
      if (!target.active)
        return
      const fileKind = classifyFile(file)
      if (fileKind !== 'unsupported' && fileKind !== 'image') {
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 插入位置依赖前一个文件的转换结果。
          const parsed = await parseFileToMarkdown(file)
          if (!parsed) {
            continue
          }
          const separator = lastInserted === 'text' && parsed.content
            ? completeBlockSeparator(lastTextContent)
            : ''
          const content = `${separator}${parsed.content}`
          if (!target.insert(content)) {
            toast.info(IMPORT_CANCELLED_MESSAGE)
            return
          }
          if (content) {
            lastInserted = 'text'
            lastTextContent = parsed.content
          }
          const label = parsed.kind === 'html' ? 'HTML' : parsed.kind === 'document' ? '文档' : 'Markdown'
          toast.success(`${label} 导入成功: ${file.name}`)
        }
        catch (error) {
          if (!target.active) {
            toast.info(IMPORT_CANCELLED_MESSAGE)
            return
          }
          const label = fileKind === 'html' ? 'HTML 解析' : fileKind === 'document' ? '文档转换' : 'Markdown 读取'
          console.error(`${label} error:`, error)
          toast.error(fileKind === 'document' && error instanceof DocumentImportError
            ? getDocumentImportErrorMessage(file.name, error)
            : `${label}失败: ${file.name}`)
        }
        continue
      }

      if (fileKind === 'image') {
        const toastId = toast.loading(enableImageOcr
          ? `正在识别 ${file.name}…`
          : `正在上传 ${file.name}…`)
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 图片插入位置依赖前一个文件的结果。
          const result = await prepareImageImport(file, enableImageOcr, enableEnhancedImageOcr)
          if (!target.active) {
            toast.info(IMPORT_CANCELLED_MESSAGE, { id: toastId })
            return
          }
          if (!result.content) {
            toast.info(`${file.name} 中未识别到文字`, { id: toastId })
            continue
          }

          const separator = lastInserted === 'text' ? completeBlockSeparator(lastTextContent) : ''
          const content = `${separator}${result.content}`
          if (!target.insert(content)) {
            toast.info(IMPORT_CANCELLED_MESSAGE, { id: toastId })
            return
          }
          lastInserted = result.kind
          if (result.kind === 'text') {
            lastTextContent = result.content
          }
          const message = result.kind === 'text'
            ? `已识别 ${file.name}`
            : `图片上传成功: ${file.name}`
          toast.success(message, { id: toastId })
        }
        catch (error) {
          if (!target.active) {
            toast.info(IMPORT_CANCELLED_MESSAGE, { id: toastId })
            return
          }
          console.error(enableImageOcr ? 'Image OCR error:' : 'Image upload error:', error)
          const message = enableImageOcr
            ? `无法识别 ${file.name}，请重试`
            : error instanceof Error ? error.message : `图片上传失败: ${file.name}`
          toast.error(message, { id: toastId })
        }
        continue
      }

      toast.error(`不支持的文件: ${file.name}`)
    }
  }
  finally {
    target.dispose()
  }
}
