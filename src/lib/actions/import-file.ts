import { toast } from 'sonner'

const ACCEPT_TYPES = 'text/html,text/markdown,.md,image/*'

/**
 * 触发文件选择对话框
 * 使用 window.focus 事件兜底处理用户取消选择的情况
 */
export function triggerImportDialog(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = ACCEPT_TYPES

    let resolved = false

    function cleanup() {
      input.onchange = null
      window.removeEventListener('focus', handleWindowFocus)
    }

    function handleWindowFocus() {
      // 延迟检查，给 change 事件一点时间触发
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve([])
        }
      }, 300)
    }

    input.onchange = (e) => {
      if (resolved)
        return
      resolved = true
      cleanup()
      const target = e.target as HTMLInputElement
      resolve(target.files ? Array.from(target.files) : [])
    }

    window.addEventListener('focus', handleWindowFocus, { once: true })
    input.click()
  })
}

export async function handleImportFiles() {
  const files = await triggerImportDialog()
  if (!files.length)
    return

  const { getImportEditorView, importFiles } = await import(
    '@/components/markdown/editor/file-import',
  )
  const view = getImportEditorView()
  if (!view) {
    toast.error('编辑器尚未就绪')
    return
  }
  await importFiles(view, files)
}
