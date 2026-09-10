import type { ViewUpdate } from '@codemirror/view'
import { EditorView, ViewPlugin } from '@codemirror/view'
import { toast } from 'sonner'
import { importFilesAsNewTabs, partitionImportFiles } from '@/lib/file-importer'
import { AsyncImportTarget, attachImportView, detachImportView, IMPORT_CANCELLED_MESSAGE, updateImportTargets } from './async-import-target'
import { importFilesToEditor } from './import-files'

export { importFilesToEditor } from './import-files'

let currentEditorView: EditorView | null = null

export function getImportEditorView(): EditorView | null {
  return currentEditorView
}

function getFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return []
  }

  const filesFromItems: File[] = []
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      filesFromItems.push(file)
    }
  }

  return filesFromItems.length
    ? filesFromItems
    : Array.from(dataTransfer.files ?? [])
}

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|\*\*|__|```|^\s*[-*+]\s|\[.+\]\(.+\)/m.test(text)
}

export const importViewTrackerExtension = ViewPlugin.fromClass(
  class {
    private view: EditorView

    constructor(view: EditorView) {
      this.view = view
      currentEditorView = view
      attachImportView(view)
    }

    update(update: ViewUpdate) {
      updateImportTargets(this.view, update.transactions)
    }

    destroy() {
      detachImportView(this.view)
      if (currentEditorView === this.view) {
        currentEditorView = null
      }
    }
  },
)

export const importDropPasteExtension = EditorView.domEventHandlers({
  drop(event, view) {
    const files = getFilesFromDataTransfer(event.dataTransfer)
    if (!files.length) {
      return
    }

    event.preventDefault()

    const { nonImageFiles, imageFiles } = partitionImportFiles(files)

    if (nonImageFiles.length > 0) {
      void importFilesAsNewTabs(nonImageFiles)
    }

    if (imageFiles.length > 0) {
      void importFilesToEditor(view, imageFiles, view.state.selection.main.anchor)
    }
  },
  paste(event, view) {
    const files = getFilesFromDataTransfer(event.clipboardData)
    if (files.length) {
      event.preventDefault()
      const insertPos = view.state.selection.main.anchor
      void importFilesToEditor(view, files, insertPos)
      return
    }

    const html = event.clipboardData?.getData('text/html') ?? ''
    const text = event.clipboardData?.getData('text/plain') ?? ''

    // 如果纯文本看起来已经是 Markdown，跳过 HTML 解析
    if (!html || looksLikeMarkdown(text)) {
      return
    }

    event.preventDefault()
    const selection = view.state.selection.main
    const target = new AsyncImportTarget(view, selection.from, selection.to)
    void (async () => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const { result: md } = await markdown.parse({ html })
        if (!target.insert(md)) {
          toast.info(IMPORT_CANCELLED_MESSAGE)
          return
        }
        toast.success('HTML 解析成功')
      }
      catch (error) {
        if (!target.active) {
          toast.info(IMPORT_CANCELLED_MESSAGE)
          return
        }
        console.error('HTML parse error:', error)
        toast.error('HTML 解析失败')
      }
      finally {
        target.dispose()
      }
    })()
  },
})
