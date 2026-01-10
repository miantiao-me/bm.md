import { useFileReplaceStore } from '@/stores/file-replace'
import { useMarkdownStore } from '@/stores/markdown'

export function initFileHandler() {
  if (!('launchQueue' in window))
    return

  window.launchQueue!.setConsumer(async (launchParams) => {
    if (!launchParams.files?.length)
      return

    for (const fileHandle of launchParams.files) {
      try {
        const file = await fileHandle.getFile()
        if (!file.name.match(/\.(md|markdown|mdown|mkd)$/i))
          continue

        const content = await file.text()
        const currentContent = useMarkdownStore.getState().content.trim()

        if (currentContent === '') {
          useMarkdownStore.getState().setContent(content)
        }
        else {
          useFileReplaceStore.getState().open(file.name, content)
        }
        break
      }
      catch (err) {
        console.error('[bm.md] 无法读取文件:', err)
      }
    }
  })
}
