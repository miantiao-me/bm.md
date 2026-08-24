import type { KeyboardEvent } from 'react'
import type { MarkdownFile } from '@/stores/files'
import { FileText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getFileTabKeyboardAction } from './keyboard'

interface FileTabProps {
  file: MarkdownFile
  currentIndex: number
  fileCount: number
  isActive: boolean
  tabIndex: number
  tabId: string
  panelId: string
  tabRef: (element: HTMLButtonElement | null) => void
  onActivate: () => Promise<void>
  onClose: () => Promise<void>
  onKeyboardActivate: (index: number, moveFocus: boolean) => Promise<void>
  onRename: (name: string) => Promise<void>
}

export function FileTab({
  file,
  currentIndex,
  fileCount,
  isActive,
  tabIndex,
  tabId,
  panelId,
  tabRef,
  onActivate,
  onClose,
  onKeyboardActivate,
  onRename,
}: FileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const tabButtonRef = useRef<HTMLButtonElement>(null)

  const startEditing = () => {
    setEditName(file.name)
    setIsEditing(true)
  }

  const restoreTabFocus = () => {
    requestAnimationFrame(() => tabButtonRef.current?.focus())
  }

  const handleSave = async (restoreFocus = false) => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== file.name) {
      try {
        await onRename(trimmed)
      }
      catch {
        setIsEditing(false)
        return
      }
    }
    setIsEditing(false)
    if (restoreFocus) {
      restoreTabFocus()
    }
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSave(true)
    }
    else if (event.key === 'Escape') {
      setIsEditing(false)
      setEditName(file.name)
      restoreTabFocus()
    }
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const action = getFileTabKeyboardAction(event.key, currentIndex, fileCount)
    if (!action) {
      return
    }

    event.preventDefault()
    if (action.type === 'rename') {
      startEditing()
      return
    }
    if (action.type === 'close') {
      void onClose()
      return
    }

    void onKeyboardActivate(action.index, action.moveFocus)
  }

  const setTabButtonRef = (element: HTMLButtonElement | null) => {
    tabButtonRef.current = element
    tabRef(element)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      const dotIndex = file.name.lastIndexOf('.')
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex)
      }
      else {
        inputRef.current.select()
      }
    }
  }, [isEditing, file.name])

  return (
    <div
      className={cn(
        'group relative flex h-7 shrink-0 items-center text-xs select-none',
        'hover:bg-accent',
        isActive
          ? 'bg-accent text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]'
          : `
            text-muted-foreground
            hover:text-foreground
          `,
      )}
    >
      <button
        ref={setTabButtonRef}
        id={tabId}
        type="button"
        role="tab"
        aria-controls={panelId}
        aria-selected={isActive}
        tabIndex={isEditing ? -1 : tabIndex}
        className={cn(
          `
            flex h-full min-w-0 items-center gap-1.5 px-2 outline-none
            focus-visible:ring-1 focus-visible:ring-ring/50
            focus-visible:ring-inset
          `,
          isEditing && 'w-32 opacity-0',
        )}
        onClick={() => void onActivate()}
        onDoubleClick={startEditing}
        onKeyDown={handleTabKeyDown}
      >
        <FileText className={cn('size-3.5 shrink-0', isActive && 'text-primary')} aria-hidden="true" />
        <span className="max-w-48 truncate" title={file.name}>{file.name}</span>
        <span className="sr-only">，按 F2 重命名，按 Delete 关闭</span>
      </button>
      {isEditing
        ? (
            <input
              ref={inputRef}
              type="text"
              aria-label={`重命名 ${file.name}`}
              value={editName}
              onChange={event => setEditName(event.target.value)}
              onBlur={() => void handleSave()}
              onKeyDown={handleInputKeyDown}
              className={`
                absolute inset-y-1 left-2 w-28 border-b border-primary bg-accent
                px-0.5 text-xs outline-none
              `}
            />
          )
        : null}
      <button
        type="button"
        aria-label={`关闭 ${file.name}`}
        tabIndex={-1}
        className={cn(
          `
            flex size-6 shrink-0 items-center justify-center transition-opacity
            outline-none
            focus-visible:ring-1 focus-visible:ring-ring/50
            focus-visible:ring-inset
          `,
          'hover:bg-muted',
          isActive
            ? `
              opacity-60
              hover:opacity-100
            `
            : `
              opacity-0
              group-hover:opacity-60
              group-hover:hover:opacity-100
              focus-visible:opacity-100
            `,
        )}
        onClick={() => void onClose()}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </div>
  )
}
