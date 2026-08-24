import type { PreviewColorScheme, PreviewWidth } from '@/stores/preview'
import type { InfographicPaletteId, InfographicThemeId } from '@/themes/infographic-theme'
import type { MarkdownStyleId } from '@/themes/markdown-style/metadata'
import type { MermaidThemeId } from '@/themes/mermaid-theme'
import { useEditorStore } from '@/stores/editor'
import { isFileContentReady, useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'

export interface PreviewSignatureInput {
  contentFileId: string | null
  currentContent: string
  previewWidth: PreviewWidth
  markdownStyle: MarkdownStyleId
  codeTheme: string
  mermaidTheme: MermaidThemeId
  infographicTheme: InfographicThemeId
  infographicPalette: InfographicPaletteId
  customCss: string
  enableFootnoteLinks: boolean
  openLinksInNewWindow: boolean
  previewColorScheme: PreviewColorScheme
}

export function createPreviewSignature(input: PreviewSignatureInput): string {
  return JSON.stringify([
    input.contentFileId,
    input.currentContent,
    input.previewWidth,
    input.markdownStyle,
    input.codeTheme,
    input.mermaidTheme,
    input.infographicTheme,
    input.infographicPalette,
    input.customCss,
    input.enableFootnoteLinks,
    input.openLinksInNewWindow,
    input.previewColorScheme,
  ])
}

function getCurrentPreviewSignature(): string {
  const files = useFilesStore.getState()
  const preview = usePreviewStore.getState()
  const editor = useEditorStore.getState()

  return createPreviewSignature({
    contentFileId: files.contentFileId,
    currentContent: files.currentContent,
    previewWidth: preview.previewWidth,
    markdownStyle: preview.markdownStyle,
    codeTheme: preview.codeTheme,
    mermaidTheme: preview.mermaidTheme,
    infographicTheme: preview.infographic.theme,
    infographicPalette: preview.infographic.palette,
    customCss: preview.customCss,
    enableFootnoteLinks: editor.enableFootnoteLinks,
    openLinksInNewWindow: editor.openLinksInNewWindow,
    previewColorScheme: preview.previewColorScheme,
  })
}

export function isPreviewSignatureCurrent(signature: string): boolean {
  return signature === getCurrentPreviewSignature()
}

export function isPreviewReadyNow(): boolean {
  const files = useFilesStore.getState()
  return isFileContentReady(files)
    && usePreviewStore.getState().renderedSignature === getCurrentPreviewSignature()
}

export function useIsPreviewReady(): boolean {
  const isFileReady = useFilesStore(isFileContentReady)
  const contentFileId = useFilesStore(state => state.contentFileId)
  const currentContent = useFilesStore(state => state.currentContent)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const customCss = usePreviewStore(state => state.customCss)
  const previewColorScheme = usePreviewStore(state => state.previewColorScheme)
  const renderedSignature = usePreviewStore(state => state.renderedSignature)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)

  const signature = createPreviewSignature({
    contentFileId,
    currentContent,
    previewWidth,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographicTheme: infographic.theme,
    infographicPalette: infographic.palette,
    customCss,
    enableFootnoteLinks,
    openLinksInNewWindow,
    previewColorScheme,
  })

  return isFileReady && renderedSignature === signature
}
