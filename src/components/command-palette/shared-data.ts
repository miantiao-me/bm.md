import {
  editorCommandConfig,
  editorSettingsConfig,
  navigationConfig,
  platformConfig,
  supportedPlatforms,
  viewModeConfig,
} from '@/config'
import { getIcon } from '@/lib/icon-map'

export interface HotkeyConfig {
  key: string
  shift: boolean
}

export type CommandPaletteSubMenu = 'markdownStyle' | 'codeTheme' | 'mermaidTheme' | 'infographicTheme' | 'infographicPalette'

export const ImportCommandIcon = getIcon(editorCommandConfig.import.icon)
export const ExportCommandIcon = getIcon(editorCommandConfig.export.icon)
export const FormatCommandIcon = getIcon(editorCommandConfig.format.icon)
export const ExportImageCommandIcon = getIcon(editorCommandConfig.exportImage.icon)
export const CopyImageCommandIcon = getIcon(editorCommandConfig.copyImage.icon)
export const ExportPdfCommandIcon = getIcon(editorCommandConfig.exportPdf.icon)
export const PrintPreviewCommandIcon = getIcon(editorCommandConfig.printPreview.icon)
export const ThemeLightCommandIcon = getIcon(editorCommandConfig.themeToggle.iconLight)
export const ThemeDarkCommandIcon = getIcon(editorCommandConfig.themeToggle.iconDark)
export const MobileViewIcon = getIcon(viewModeConfig.mobile.icon)
export const DesktopViewIcon = getIcon(viewModeConfig.desktop.icon)

export const editorSettingsItems = editorSettingsConfig.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

export const platformItems = supportedPlatforms.map((platform) => {
  const config = platformConfig[platform]

  return {
    platform,
    config,
    Icon: getIcon(config.icon),
  }
})

export const internalNavigationItems = navigationConfig.internal.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

export const externalNavigationItems = navigationConfig.external.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))
