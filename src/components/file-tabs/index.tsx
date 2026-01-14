import { useEffect, useRef } from 'react'
import { useFilesStore } from '@/stores/files'
import { FileTab } from './file-tab'
import { NewFileButton } from './new-file-button'

export function FileTabs() {
  const files = useFilesStore(state => state.files)
  const activeFileId = useFilesStore(state => state.activeFileId)
  const isInitialized = useFilesStore(state => state.isInitialized)
  const hasHydrated = useFilesStore(state => state.hasHydrated)
  const initialize = useFilesStore(state => state.initialize)
  const switchFile = useFilesStore(state => state.switchFile)
  const createFile = useFilesStore(state => state.createFile)
  const deleteFile = useFilesStore(state => state.deleteFile)
  const renameFile = useFilesStore(state => state.renameFile)

  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (hasHydrated) {
      initialize()
    }
  }, [hasHydrated, initialize])

  useEffect(() => {
    if (isInitialized && activeFileId) {
      // 延迟一帧确保 DOM 已渲染且 ref 已注册
      requestAnimationFrame(() => {
        const tabElement = tabRefs.current.get(activeFileId)
        if (tabElement) {
          tabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          })
        }
      })
    }
  }, [isInitialized, activeFileId])

  const handleCreateFile = async () => {
    const id = await createFile()
    await switchFile(id)
  }

  const setTabRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      tabRefs.current.set(id, el)
    }
    else {
      tabRefs.current.delete(id)
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex h-8 shrink-0 items-center border-b bg-muted/30 px-1" />
    )
  }

  return (
    <div
      role="tablist"
      aria-label="打开的文件"
      className="flex h-8 shrink-0 items-center border-b bg-muted/30"
    >
      <div
        className="scrollbar-none flex min-w-0 flex-1 overflow-x-auto"
      >
        {files.map(file => (
          <div key={file.id} ref={setTabRef(file.id)} role="presentation">
            <FileTab
              file={file}
              isActive={file.id === activeFileId}
              onSelect={() => switchFile(file.id)}
              onClose={() => deleteFile(file.id)}
              onRename={name => renameFile(file.id, name)}
            />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-l px-1">
        <NewFileButton onClick={handleCreateFile} />
      </div>
    </div>
  )
}
