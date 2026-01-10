import { create } from 'zustand'
import { useMarkdownStore } from './markdown'

interface FileReplaceState {
  isOpen: boolean
  fileName: string
  content: string
  open: (fileName: string, content: string) => void
  close: () => void
  confirm: () => void
}

export const useFileReplaceStore = create<FileReplaceState>(set => ({
  isOpen: false,
  fileName: '',
  content: '',
  open: (fileName, content) => set({ isOpen: true, fileName, content }),
  close: () => set({ isOpen: false, fileName: '', content: '' }),
  confirm: () => {
    set((state) => {
      useMarkdownStore.getState().setContent(state.content)
      return { isOpen: false, fileName: '', content: '' }
    })
  },
}))
