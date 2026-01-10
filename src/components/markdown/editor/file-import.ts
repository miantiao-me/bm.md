import { EditorView, ViewPlugin } from '@codemirror/view'
import { toast } from 'sonner'
import { uploadImage } from '@/services/upload'

let currentEditorView: EditorView | null = null

export function getImportEditorView(): EditorView | null {
  return currentEditorView
}

function getFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return []
  }

  const items = Array.from(dataTransfer.items ?? [])
  const filesFromItems = items
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))

  return filesFromItems.length
    ? filesFromItems
    : Array.from(dataTransfer.files ?? [])
}

function looksLikeMarkdown(text: string): boolean {
  // 检测常见 Markdown 语法特征：标题、加粗、代码块、列表、链接
  return /^#{1,6}\s|\*\*|--|__|```|^\s*[-*+]\s|\[.+\]\(.+\)/m.test(text)
}

export const importViewTrackerExtension = ViewPlugin.fromClass(
  class {
    private view: EditorView

    constructor(view: EditorView) {
      this.view = view
      currentEditorView = view
    }

    destroy() {
      if (currentEditorView === this.view) {
        currentEditorView = null
      }
    }
  },
)

export async function importFiles(
  view: EditorView,
  files: File[],
  insertPos?: number,
): Promise<void> {
  if (!files.length) {
    return
  }

  let currentInsertPos = insertPos ?? view.state.selection.main.anchor

  for (const file of files) {
    if (file.type === 'text/html') {
      try {
        const html = await file.text()
        const { markdown } = await import('@/lib/markdown/browser')
        const { result: md } = await markdown.parse({ html })
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: md },
          selection: { anchor: 0 },
        })
        toast.success(`HTML 导入成功: ${file.name}`)
        break
      }
      catch (error) {
        console.error('HTML parse error:', error)
        toast.error(`HTML 解析失败: ${file.name}`)
      }
      continue
    }

    if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      try {
        const md = await file.text()
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: md },
          selection: { anchor: 0 },
        })
        toast.success(`Markdown 导入成功: ${file.name}`)
        break
      }
      catch (error) {
        console.error('Markdown read error:', error)
        toast.error(`Markdown 读取失败: ${file.name}`)
      }
      continue
    }

    if (file.type.startsWith('image/')) {
      const toastId = toast.loading(`正在上传 ${file.name}...`)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        const result = await uploadImage(formData)

        const imageMarkdown = `\n![${file.name}](${result.url})\n`

        view.dispatch({
          changes: { from: currentInsertPos, insert: imageMarkdown },
          selection: { anchor: currentInsertPos + imageMarkdown.length },
        })
        currentInsertPos += imageMarkdown.length
        toast.success(`图片上传成功: ${file.name}`, { id: toastId })
      }
      catch (error: any) {
        console.error('Image upload error:', error)
        toast.error(error.message || `图片上传失败: ${file.name}`, { id: toastId })
      }
      continue
    }
  }
}

export const importDropPasteExtension = EditorView.domEventHandlers({
  drop(event, view) {
    const files = getFilesFromDataTransfer(event.dataTransfer)
    if (!files.length) {
      return
    }

    event.preventDefault()
    const insertPos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      ?? view.state.selection.main.anchor

    void importFiles(view, files, insertPos)
  },
  paste(event, view) {
    const files = getFilesFromDataTransfer(event.clipboardData)
    if (files.length) {
      event.preventDefault()
      const insertPos = view.state.selection.main.anchor
      void importFiles(view, files, insertPos)
      return
    }

    const html = event.clipboardData?.getData('text/html') ?? ''
    const text = event.clipboardData?.getData('text/plain') ?? ''

    // 如果纯文本看起来已经是 Markdown，跳过 HTML 解析
    if (!html || looksLikeMarkdown(text)) {
      return
    }

    event.preventDefault()
    const insertPos = view.state.selection.main.anchor
    void (async () => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const { result: md } = await markdown.parse({ html })
        view.dispatch({
          changes: { from: insertPos, insert: md },
          selection: { anchor: insertPos + md.length },
        })
        toast.success('HTML 解析成功')
      }
      catch (error) {
        console.error('HTML parse error:', error)
        toast.error('HTML 解析失败')
      }
    })()
  },
})
