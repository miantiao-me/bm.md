import { useEffect, useRef, useState } from 'react'
import { useFilesStore } from '@/stores/files'
import { FILE_TAB_PANEL_ID, getFileTabId } from './a11y'
import { FileTab } from './file-tab'
import { NewFileButton } from './new-file-button'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 标签栏溢出时用 inset 阴影提示左右还有更多标签，滚动条已用 scrollbar-none 隐藏
const EDGE_SHADOW = 'color-mix(in oklch, var(--foreground) 15%, transparent)'

export function FileTabs() {
  const files = useFilesStore(state => state.files)
  const activeFileId = useFilesStore(state => state.activeFileId)
  const isInitialized = useFilesStore(state => state.isInitialized)
  const initialize = useFilesStore(state => state.initialize)
  const switchFile = useFilesStore(state => state.switchFile)
  const createFile = useFilesStore(state => state.createFile)
  const deleteFile = useFilesStore(state => state.deleteFile)
  const renameFile = useFilesStore(state => state.renameFile)

  const tabsRef = useRef<Map<string, HTMLButtonElement> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }

    const updateScrollState = () => {
      // eslint-disable-next-line react/set-state-in-effect -- 滚动/尺寸变化后同步刷新遮罩状态是合理的模式
      setCanScrollLeft(el.scrollLeft > 1)
      // eslint-disable-next-line react/set-state-in-effect -- 同上
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
    // files.length 变化会改变可滚动空间，需要重新计算
  }, [files.length])

  useEffect(() => {
    void initialize().catch(() => undefined)
  }, [initialize])

  useEffect(() => {
    if (isInitialized && activeFileId) {
      // 延迟一帧确保 DOM 已渲染且 ref 已注册
      requestAnimationFrame(() => {
        const tabElement = tabsRef.current?.get(activeFileId)
        if (tabElement) {
          tabElement.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'nearest',
          })
        }
      })
    }
  }, [isInitialized, activeFileId])

  const handleCreateFile = async () => {
    await createFile().catch(() => undefined)
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId)
    }
    catch {
      return
    }

    const nextActiveFileId = useFilesStore.getState().activeFileId
    if (!nextActiveFileId) {
      return
    }

    requestAnimationFrame(() => {
      tabsRef.current?.get(nextActiveFileId)?.focus()
    })
  }

  const setTabRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (!tabsRef.current) {
      tabsRef.current = new Map()
    }

    if (el) {
      tabsRef.current.set(id, el)
    }
    else {
      tabsRef.current.delete(id)
    }
  }

  const handleActivate = async (fileId: string) => {
    await switchFile(fileId).catch(() => undefined)
  }

  const handleTabKeyboardActivate = async (index: number, moveFocus: boolean) => {
    const file = files[index]
    try {
      await switchFile(file.id)
    }
    catch {
      return
    }

    if (moveFocus) {
      requestAnimationFrame(() => {
        tabsRef.current?.get(file.id)?.focus()
      })
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex h-8 shrink-0 items-center border-b bg-muted/30 px-1" />
    )
  }

  return (
    <div className="flex h-8 shrink-0 items-center border-b bg-muted/30">
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="打开的文件"
        className="flex min-w-0 flex-1 scrollbar-none overflow-x-auto"
        style={{
          boxShadow: [
            canScrollLeft && `inset 8px 0 6px -6px ${EDGE_SHADOW}`,
            canScrollRight && `inset -8px 0 6px -6px ${EDGE_SHADOW}`,
          ].filter(Boolean).join(', ') || undefined,
        }}
      >
        {files.map((file, index) => (
          <FileTab
            key={file.id}
            file={file}
            currentIndex={index}
            fileCount={files.length}
            isActive={file.id === activeFileId}
            tabIndex={file.id === activeFileId ? 0 : -1}
            tabId={getFileTabId(file.id)}
            panelId={FILE_TAB_PANEL_ID}
            tabRef={setTabRef(file.id)}
            onActivate={() => handleActivate(file.id)}
            onClose={() => handleDeleteFile(file.id)}
            onKeyboardActivate={handleTabKeyboardActivate}
            onRename={name => renameFile(file.id, name)}
          />
        ))}
      </div>
      <div className="shrink-0 border-l px-1">
        <NewFileButton onClick={handleCreateFile} />
      </div>
    </div>
  )
}
