import type { SupportedPlatform } from '@/config'
import type { EditorBooleanKey, EditorBooleanSetterKey } from '@/stores/editor'
import type { InfographicSettings } from '@/stores/preview'
import type { MarkdownStyleId } from '@/themes/markdown-style/metadata'
import type { MermaidThemeId } from '@/themes/mermaid-theme'
import { useNavigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { usePlatformCopy } from '@/components/markdown/previewer/action-bar/use-platform-copy'
import { isPreviewReadyNow } from '@/components/markdown/previewer/preview-ready'
import { editorCommandConfig, platformConfig } from '@/config'
import { copyPlatform } from '@/lib/actions/copy-platform'
import { copyImage, exportImage } from '@/lib/actions/export-image'
import { exportMarkdown } from '@/lib/actions/export-markdown'
import { exportPdf, printPreview } from '@/lib/actions/export-pdf'
import { formatMarkdown } from '@/lib/actions/format'
import { handleImportFiles } from '@/lib/actions/import-file'
import { toggleTheme } from '@/lib/actions/toggle-theme'
import { trackEvent } from '@/lib/analytics'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useEditorStore } from '@/stores/editor'
import { isFileContentReady, useFilesStore } from '@/stores/files'
import {
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from '@/stores/preview'
import { useHotkeys } from './use-hotkeys'

export interface CommandPaletteActions {
  markdownStyle: MarkdownStyleId
  codeTheme: string
  mermaidTheme: MermaidThemeId
  infographic: InfographicSettings
  isDark: boolean
  isMobileView: boolean
  isDesktopView: boolean
  resetSubMenu: () => void
  handleNewFile: () => Promise<void>
  handleImport: () => void
  handleExport: () => void
  handleFormat: () => Promise<void>
  handleOpenResetDialog: () => void
  handleCopyPlatform: (platform: SupportedPlatform) => () => Promise<void>
  handleExportImage: () => Promise<void>
  handleCopyImage: () => Promise<void>
  handleExportPdf: () => Promise<void>
  handlePrintPreview: () => void
  handleThemeToggle: () => void
  handleMobileView: () => void
  handleDesktopView: () => void
  handleNavigate: (path: string) => void
  handleExternalLink: (url: string) => void
  isSettingEnabled: (storeKey: EditorBooleanKey) => boolean
  handleToggleSetting: (storeKey: EditorBooleanKey, setterKey: EditorBooleanSetterKey) => void
  handleSelectMarkdownStyle: (id: MarkdownStyleId) => void
  handleSelectCodeTheme: (id: string) => void
  handleSelectMermaidTheme: (id: MermaidThemeId) => void
  handleSelectInfographicTheme: (id: string) => void
  handleSelectInfographicPalette: (id: string) => void
}

export function useCommandPaletteActions(setResetDialogOpen: (open: boolean) => void): CommandPaletteActions {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const setOpen = useCommandPaletteStore(state => state.setOpen)
  const resetSubMenu = useCommandPaletteStore(state => state.resetSubMenu)

  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const settings = {
    enableFootnoteLinks,
    openLinksInNewWindow,
    enableScrollSync,
  }

  const previewWidth = usePreviewStore(state => state.previewWidth)
  const setPreviewWidth = usePreviewStore(state => state.setPreviewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const setCodeTheme = usePreviewStore(state => state.setCodeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const setMermaidTheme = usePreviewStore(state => state.setMermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const setInfographic = usePreviewStore(state => state.setInfographic)

  const wechatCopy = usePlatformCopy('wechat')
  const htmlCopy = usePlatformCopy('html')

  const platformCopyGetters: Record<SupportedPlatform, () => Promise<string>> = {
    wechat: wechatCopy.getHtml,
    html: htmlCopy.getHtml,
  }

  const isDark = theme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const closePanel = () => {
    setOpen(false)
  }

  const handleNewFile = async () => {
    closePanel()
    trackEvent('editor', 'new-file', 'menu')
    await useFilesStore.getState().createFile().catch(() => undefined)
  }

  const handleImport = () => {
    closePanel()
    trackEvent('editor', 'import', 'menu')
    setTimeout(() => {
      handleImportFiles()
    }, 150)
  }

  const handleExport = () => {
    closePanel()
    const filesState = useFilesStore.getState()
    if (!isFileContentReady(filesState)) {
      toast.info('文件仍在加载')
      return
    }
    trackEvent('export', 'markdown', 'menu')
    exportMarkdown(filesState.currentContent)
  }

  const handleFormat = async () => {
    closePanel()
    const filesState = useFilesStore.getState()
    if (!isFileContentReady(filesState)) {
      toast.info('文件仍在加载')
      return
    }
    trackEvent('editor', 'format', 'menu')
    const { activeFileId, currentContent, replaceFileContentIfUnchanged } = filesState
    if (!activeFileId) {
      return
    }
    await formatMarkdown(
      currentContent,
      nextContent => replaceFileContentIfUnchanged(activeFileId, currentContent, nextContent),
    )
  }

  const handleOpenResetDialog = () => {
    closePanel()
    setTimeout(setResetDialogOpen, 150, true)
  }

  const handleCopyPlatform = (platform: SupportedPlatform) => async () => {
    closePanel()
    if (!isFileContentReady(useFilesStore.getState())) {
      toast.info('文件仍在加载')
      return
    }
    await copyPlatform({
      platform,
      markdownStyle,
      codeTheme,
      mermaidTheme,
      infographicTheme: infographic.theme,
      infographicPalette: infographic.palette,
      source: 'menu',
      getHtml: platformCopyGetters[platform],
    })
  }

  const handleExportImage = async () => {
    closePanel()
    if (!isPreviewReadyNow()) {
      toast.info('预览仍在更新')
      return
    }
    trackEvent('export', 'image', 'menu')
    await exportImage()
  }

  const handleCopyImage = async () => {
    closePanel()
    if (!isPreviewReadyNow()) {
      toast.info('预览仍在更新')
      return
    }
    trackEvent('copy', 'image', 'menu')
    await copyImage()
  }

  const handleExportPdf = async () => {
    closePanel()
    if (!isPreviewReadyNow()) {
      toast.info('预览仍在更新')
      return
    }
    trackEvent('export', 'pdf', 'menu')
    await exportPdf()
  }

  const handlePrintPreview = () => {
    closePanel()
    if (!isPreviewReadyNow()) {
      toast.info('预览仍在更新')
      return
    }
    trackEvent('export', 'print', 'menu')
    printPreview()
  }

  const handleThemeToggle = () => {
    trackEvent('theme', 'toggle', 'menu')
    toggleTheme(isDark, setTheme)
  }

  const handleMobileView = () => {
    closePanel()
    setPreviewWidth(PREVIEW_WIDTH_MOBILE)
  }

  const handleDesktopView = () => {
    closePanel()
    setPreviewWidth(PREVIEW_WIDTH_DESKTOP)
  }

  const handleNavigate = (path: string) => {
    closePanel()
    navigate({ to: path })
  }

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    closePanel()
  }

  const isSettingEnabled = (storeKey: EditorBooleanKey) => {
    return settings[storeKey]
  }

  const handleToggleSetting = (storeKey: EditorBooleanKey, setterKey: EditorBooleanSetterKey) => {
    const editorStore = useEditorStore.getState()
    const currentValue = editorStore[storeKey]
    const setter = editorStore[setterKey]
    setter(!currentValue)
  }

  const handleSelectMarkdownStyle = (id: MarkdownStyleId) => {
    setMarkdownStyle(id)
    resetSubMenu()
    closePanel()
  }

  const handleSelectCodeTheme = (id: string) => {
    setCodeTheme(id)
    resetSubMenu()
    closePanel()
  }

  const handleSelectMermaidTheme = (id: MermaidThemeId) => {
    setMermaidTheme(id)
    resetSubMenu()
    closePanel()
  }

  const handleSelectInfographicTheme = (id: string) => {
    setInfographic({ theme: id })
    resetSubMenu()
    closePanel()
  }

  const handleSelectInfographicPalette = (id: string) => {
    setInfographic({ palette: id })
    resetSubMenu()
    closePanel()
  }

  const hotkeyHandlers = [
    { key: editorCommandConfig.import.hotkey.key, handler: handleImport },
    { key: editorCommandConfig.export.hotkey.key, handler: handleExport },
    { key: editorCommandConfig.format.hotkey.key, shift: editorCommandConfig.format.hotkey.shift, handler: handleFormat },
    { key: platformConfig.wechat.hotkey.key, shift: platformConfig.wechat.hotkey.shift, handler: handleCopyPlatform('wechat') },
    { key: platformConfig.html.hotkey.key, shift: platformConfig.html.hotkey.shift, handler: handleCopyPlatform('html') },
  ]

  useHotkeys(hotkeyHandlers)

  return {
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographic,
    isDark,
    isMobileView,
    isDesktopView,
    resetSubMenu,
    handleNewFile,
    handleImport,
    handleExport,
    handleFormat,
    handleOpenResetDialog,
    handleCopyPlatform,
    handleExportImage,
    handleCopyImage,
    handleExportPdf,
    handlePrintPreview,
    handleThemeToggle,
    handleMobileView,
    handleDesktopView,
    handleNavigate,
    handleExternalLink,
    isSettingEnabled,
    handleToggleSetting,
    handleSelectMarkdownStyle,
    handleSelectCodeTheme,
    handleSelectMermaidTheme,
    handleSelectInfographicTheme,
    handleSelectInfographicPalette,
  }
}
