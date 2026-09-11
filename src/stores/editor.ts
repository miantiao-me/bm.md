import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface EditorState {
  // Scroll
  scrollRatio: number
  scrollSource: ScrollSource
  setScrollFromEditor: (ratio: number) => void
  setScrollFromPreview: (ratio: number) => void

  // Settings
  enableFootnoteLinks: boolean
  setEnableFootnoteLinks: (enable: boolean) => void

  breaks: boolean
  setBreaks: (enable: boolean) => void

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
      setEnableFootnoteLinks: enable => set({ enableFootnoteLinks: enable }),

      breaks: false,
      setBreaks: enable => set({ breaks: enable }),

      openLinksInNewWindow: true,
      setOpenLinksInNewWindow: enable => set({ openLinksInNewWindow: enable }),

      enableScrollSync: true,
      setEnableScrollSync: enable => set({ enableScrollSync: enable }),
    }),
    {
      name: 'bm.md.editor',
      skipHydration: true,
      partialize: state => ({
        enableFootnoteLinks: state.enableFootnoteLinks,
        breaks: state.breaks,
        openLinksInNewWindow: state.openLinksInNewWindow,
        enableScrollSync: state.enableScrollSync,
      }),
      merge: (persistedState, currentState) => {
        const settings = persistedState as Partial<Pick<
          EditorState,
          'enableFootnoteLinks' | 'breaks' | 'openLinksInNewWindow' | 'enableScrollSync'
        >>

        return {
          ...currentState,
          enableFootnoteLinks: typeof settings.enableFootnoteLinks === 'boolean'
            ? settings.enableFootnoteLinks
            : currentState.enableFootnoteLinks,
          breaks: typeof settings.breaks === 'boolean'
            ? settings.breaks
            : currentState.breaks,
          openLinksInNewWindow: typeof settings.openLinksInNewWindow === 'boolean'
            ? settings.openLinksInNewWindow
            : currentState.openLinksInNewWindow,
          enableScrollSync: typeof settings.enableScrollSync === 'boolean'
            ? settings.enableScrollSync
            : currentState.enableScrollSync,
        }
      },
    },
  ),
)
