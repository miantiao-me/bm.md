import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usePreviewStore } from './preview'

export interface EditorState {
  // Scroll
  scrollRatio: number
  scrollSource: ScrollSource
  setScrollFromEditor: (ratio: number) => void
  setScrollFromPreview: (ratio: number) => void

  // Settings
  enableFootnoteLinks: boolean
  setEnableFootnoteLinks: (enable: boolean) => void

  openLinksInNewWindow: boolean
  setOpenLinksInNewWindow: (enable: boolean) => void

  enableScrollSync: boolean
  setEnableScrollSync: (enable: boolean) => void
}

export type EditorBooleanKey = {
  [K in keyof EditorState]: EditorState[K] extends boolean ? K : never
}[keyof EditorState]

export type EditorBooleanSetterKey = {
  [K in keyof EditorState]: EditorState[K] extends (v: boolean) => void ? K : never
}[keyof EditorState]

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value))
}

export const useEditorStore = create<EditorState>()(
  persist(
    set => ({
      // Scroll
      scrollRatio: 0,
      scrollSource: null,
      setScrollFromEditor: ratio => set({
        scrollRatio: clampRatio(ratio),
        scrollSource: 'editor',
      }),
      setScrollFromPreview: ratio => set({
        scrollRatio: clampRatio(ratio),
        scrollSource: 'preview',
      }),

      // Settings
      enableFootnoteLinks: true,
      setEnableFootnoteLinks: (enable) => {
        set({ enableFootnoteLinks: enable })
        usePreviewStore.getState().clearRenderedHtmlCache()
      },

      openLinksInNewWindow: true,
      setOpenLinksInNewWindow: (enable) => {
        set({ openLinksInNewWindow: enable })
        usePreviewStore.getState().clearRenderedHtmlCache()
      },

      enableScrollSync: true,
      setEnableScrollSync: enable => set({ enableScrollSync: enable }),
    }),
    {
      name: 'bm.md.editor',
    },
  ),
)
