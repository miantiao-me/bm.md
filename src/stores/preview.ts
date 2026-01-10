import type { Platform } from '@/lib/markdown/render/adapters'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PREVIEW_WIDTH_MOBILE = 415
export const PREVIEW_WIDTH_DESKTOP = 768

type PreviewWidth = typeof PREVIEW_WIDTH_MOBILE | typeof PREVIEW_WIDTH_DESKTOP

interface PreviewState {
  previewWidth: PreviewWidth
  setPreviewWidth: (width: PreviewWidth) => void

  userPreferredWidth: PreviewWidth
  setUserPreferredWidth: (width: PreviewWidth) => void

  markdownStyle: string
  setMarkdownStyle: (id: string) => void

  codeTheme: string
  setCodeTheme: (theme: string) => void

  renderedHtmlMap: Partial<Record<Platform, string>>
  setRenderedHtml: (platform: Platform, html: string) => void
  getRenderedHtml: (platform: Platform) => string
  clearRenderedHtmlCache: () => void
}

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set, get) => ({
      previewWidth: PREVIEW_WIDTH_MOBILE,
      setPreviewWidth: previewWidth => set({ previewWidth }),

      userPreferredWidth: PREVIEW_WIDTH_MOBILE,
      setUserPreferredWidth: userPreferredWidth => set({ previewWidth: userPreferredWidth, userPreferredWidth }),

      markdownStyle: 'ayu-light',
      setMarkdownStyle: markdownStyle => set({ markdownStyle, renderedHtmlMap: {} }),

      codeTheme: 'kimbie-light',
      setCodeTheme: codeTheme => set({ codeTheme, renderedHtmlMap: {} }),

      renderedHtmlMap: {},
      setRenderedHtml: (platform, html) => set(state => ({
        renderedHtmlMap: { ...state.renderedHtmlMap, [platform]: html },
      })),
      getRenderedHtml: platform => get().renderedHtmlMap[platform] ?? '',
      clearRenderedHtmlCache: () => set({ renderedHtmlMap: {} }),
    }),
    {
      name: 'bm.md.preview',
      partialize: state => ({
        userPreferredWidth: state.userPreferredWidth,
        markdownStyle: state.markdownStyle,
        codeTheme: state.codeTheme,
      }),
    },
  ),
)
