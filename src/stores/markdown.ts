import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import defaultMarkdown from '@/docs/features.md?raw'

interface MarkdownState {
  content: string
  setContent: (content: string) => void
  resetContent: () => void
}

export const useMarkdownStore = create<MarkdownState>()(
  persist(
    set => ({
      content: defaultMarkdown,
      setContent: content => set({ content }),
      resetContent: () => set({ content: defaultMarkdown }),
    }),
    {
      name: 'bm.md.markdown',
    },
  ),
)
