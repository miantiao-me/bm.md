import { isBoolean, pick, pickBy } from 'es-toolkit'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/shallow'

export interface EditorSettings {
  enableFootnoteLinks: boolean
  breaks: boolean
  openLinksInNewWindow: boolean
  enableScrollSync: boolean
  enableImageOcr: boolean
  enableEnhancedImageOcr: boolean
}

export type EditorSettingKey = keyof EditorSettings

export interface EditorState extends EditorSettings {
  // Scroll
  scrollRatio: number
  scrollSource: ScrollSource
  setScrollFromEditor: (ratio: number) => void
  setScrollFromPreview: (ratio: number) => void

  // Settings
  setSetting: <K extends EditorSettingKey>(key: K, value: EditorSettings[K]) => void
}

const editorSettingsDefaults: EditorSettings = {
  enableFootnoteLinks: true,
  breaks: false,
  openLinksInNewWindow: true,
  enableScrollSync: true,
  enableImageOcr: false,
  enableEnhancedImageOcr: false,
}

const editorSettingKeys = Object.keys(editorSettingsDefaults) as EditorSettingKey[]

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
      ...editorSettingsDefaults,
      setSetting: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'bm.md.editor',
      skipHydration: true,
      partialize: state => pick(state, editorSettingKeys),
      merge: (persistedState, currentState) => {
        if (persistedState === null || typeof persistedState !== 'object') {
          return currentState
        }
        const settings = pickBy(
          pick(persistedState as Partial<EditorSettings>, editorSettingKeys),
          isBoolean,
        )

        return { ...currentState, ...settings }
      },
    },
  ),
)

export function useEditorSettings(): EditorSettings {
  return useEditorStore(useShallow(state => pick(state, editorSettingKeys)))
}
