import type { SupportedPlatform } from '@/config'
import type { EditorBooleanKey, EditorBooleanSetterKey } from '@/stores/editor'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Code,
  Palette,
  RotateCcw,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useState } from 'react'
import { ResetContentDialog } from '@/components/dialog/reset-content-dialog'
import { usePlatformCopy } from '@/components/markdown/previewer/action-bar/use-platform-copy'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import {
  editorCommandConfig,
  editorSettingsConfig,
  navigationConfig,
  platformConfig,
  supportedPlatforms,
  viewModeConfig,
} from '@/config'
import {
  copyImage,
  copyPlatform,
  exportImage,
  exportMarkdown,
  formatMarkdown,
  getIcon,
  handleImportFiles,
  toggleTheme,
} from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useEditorStore } from '@/stores/editor'
import { useMarkdownStore } from '@/stores/markdown'
import {
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from '@/stores/preview'
import { codeThemes } from '@/themes/code-theme'
import { markdownStyles } from '@/themes/markdown-style'
import { useHotkeys } from './use-hotkeys'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
const modKey = isMac ? '⌘' : 'Ctrl'

function HotkeyShortcut({ hotkey }: { hotkey: { key: string, shift: boolean } }) {
  return (
    <CommandShortcut>
      <Kbd>{modKey}</Kbd>
      {hotkey.shift && <Kbd>⇧</Kbd>}
      <Kbd>{hotkey.key.toUpperCase()}</Kbd>
    </CommandShortcut>
  )
}

export function CommandPalette() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const { open, setOpen, subMenu, setSubMenu, resetSubMenu } = useCommandPaletteStore()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const { content, setContent } = useMarkdownStore()
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const setUserPreferredWidth = usePreviewStore(state => state.setUserPreferredWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const setCodeTheme = usePreviewStore(state => state.setCodeTheme)

  const editorStore = useEditorStore()

  const wechatCopy = usePlatformCopy('wechat')
  const zhihuCopy = usePlatformCopy('zhihu')
  const juejinCopy = usePlatformCopy('juejin')
  const htmlCopy = usePlatformCopy('html')

  const platformCopyGetters = useMemo(() => ({
    wechat: wechatCopy.getHtml,
    zhihu: zhihuCopy.getHtml,
    juejin: juejinCopy.getHtml,
    html: htmlCopy.getHtml,
  }), [wechatCopy.getHtml, zhihuCopy.getHtml, juejinCopy.getHtml, htmlCopy.getHtml])

  const isDark = theme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const closePanel = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const handleImport = useCallback(() => {
    closePanel()
    trackEvent('editor', 'import', 'menu')
    setTimeout(() => {
      handleImportFiles()
    }, 150)
  }, [closePanel])

  const handleExport = useCallback(() => {
    closePanel()
    trackEvent('export', 'markdown', 'menu')
    exportMarkdown(content)
  }, [closePanel, content])

  const handleFormat = useCallback(async () => {
    closePanel()
    trackEvent('editor', 'format', 'menu')
    await formatMarkdown(content, setContent)
  }, [closePanel, content, setContent])

  const handleOpenResetDialog = useCallback(() => {
    closePanel()
    setTimeout(() => setResetDialogOpen(true), 150)
  }, [closePanel])

  const handleCopyPlatform = useCallback((platform: SupportedPlatform) => async () => {
    closePanel()
    trackEvent('copy', platform, 'menu')
    await copyPlatform(platform, platformCopyGetters[platform])
  }, [closePanel, platformCopyGetters])

  const handleExportImage = useCallback(async () => {
    closePanel()
    trackEvent('export', 'image', 'menu')
    await exportImage()
  }, [closePanel])

  const handleCopyImage = useCallback(async () => {
    closePanel()
    trackEvent('copy', 'image', 'menu')
    await copyImage()
  }, [closePanel])

  const handleThemeToggle = useCallback(() => {
    trackEvent('theme', 'toggle', 'menu')
    toggleTheme(isDark, setTheme)
  }, [isDark, setTheme])

  const handleMobileView = useCallback(() => {
    closePanel()
    setUserPreferredWidth(PREVIEW_WIDTH_MOBILE)
  }, [closePanel, setUserPreferredWidth])

  const handleDesktopView = useCallback(() => {
    closePanel()
    setUserPreferredWidth(PREVIEW_WIDTH_DESKTOP)
  }, [closePanel, setUserPreferredWidth])

  const handleNavigate = useCallback((path: string) => {
    closePanel()
    navigate({ to: path })
  }, [closePanel, navigate])

  const handleExternalLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    closePanel()
  }, [closePanel])

  const handleToggleSetting = useCallback((storeKey: EditorBooleanKey, setterKey: EditorBooleanSetterKey) => {
    const currentValue = editorStore[storeKey]
    const setter = editorStore[setterKey]
    setter(!currentValue)
  }, [editorStore])

  const handleSelectMarkdownStyle = useCallback((id: string) => {
    setMarkdownStyle(id)
    resetSubMenu()
    closePanel()
  }, [setMarkdownStyle, resetSubMenu, closePanel])

  const handleSelectCodeTheme = useCallback((id: string) => {
    setCodeTheme(id)
    resetSubMenu()
    closePanel()
  }, [setCodeTheme, resetSubMenu, closePanel])

  const hotkeyHandlers = useMemo(() => [
    { key: editorCommandConfig.import.hotkey.key, handler: handleImport },
    { key: editorCommandConfig.export.hotkey.key, handler: handleExport },
    { key: editorCommandConfig.format.hotkey.key, shift: editorCommandConfig.format.hotkey.shift, handler: handleFormat },
    { key: platformConfig.wechat.hotkey.key, shift: platformConfig.wechat.hotkey.shift, handler: handleCopyPlatform('wechat') },
    { key: platformConfig.zhihu.hotkey.key, shift: platformConfig.zhihu.hotkey.shift, handler: handleCopyPlatform('zhihu') },
    { key: platformConfig.juejin.hotkey.key, shift: platformConfig.juejin.hotkey.shift, handler: handleCopyPlatform('juejin') },
    { key: platformConfig.html.hotkey.key, shift: platformConfig.html.hotkey.shift, handler: handleCopyPlatform('html') },
  ], [handleImport, handleExport, handleFormat, handleCopyPlatform])

  useHotkeys(hotkeyHandlers)

  const renderMainMenu = () => {
    const ImportIcon = getIcon(editorCommandConfig.import.icon)
    const ExportIcon = getIcon(editorCommandConfig.export.icon)
    const FormatIcon = getIcon(editorCommandConfig.format.icon)
    const ExportImageIcon = getIcon(editorCommandConfig.exportImage.icon)
    const CopyImageIcon = getIcon(editorCommandConfig.copyImage.icon)
    const ThemeIcon = getIcon(isDark ? editorCommandConfig.themeToggle.iconDark : editorCommandConfig.themeToggle.iconLight)
    const MobileIcon = getIcon(viewModeConfig.mobile.icon)
    const DesktopIcon = getIcon(viewModeConfig.desktop.icon)

    return (
      <>
        <CommandGroup heading="编辑器">
          <CommandItem onSelect={handleImport}>
            {ImportIcon && <ImportIcon className="size-4" />}
            {editorCommandConfig.import.label}
            <HotkeyShortcut hotkey={editorCommandConfig.import.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleExport}>
            {ExportIcon && <ExportIcon className="size-4" />}
            {editorCommandConfig.export.label}
            <HotkeyShortcut hotkey={editorCommandConfig.export.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleFormat}>
            {FormatIcon && <FormatIcon className="size-4" />}
            {editorCommandConfig.format.label}
            <HotkeyShortcut hotkey={editorCommandConfig.format.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleOpenResetDialog}>
            <RotateCcw className="size-4" />
            重置内容
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="编辑器设置">
          {editorSettingsConfig.map((item) => {
            const Icon = getIcon(item.icon)
            const isChecked = editorStore[item.storeKey]
            return (
              <CommandItem
                key={item.id}
                onSelect={() => handleToggleSetting(item.storeKey, item.setterKey)}
                data-checked={isChecked}
              >
                <Icon className="size-4" />
                {item.label}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="复制导出">
          {supportedPlatforms.map((platform) => {
            const config = platformConfig[platform]
            const Icon = getIcon(config.icon)
            return (
              <CommandItem key={platform} onSelect={handleCopyPlatform(platform)}>
                {Icon && <Icon className="size-4" />}
                {config.label}
                <HotkeyShortcut hotkey={config.hotkey} />
              </CommandItem>
            )
          })}
          <CommandItem onSelect={handleCopyImage}>
            {CopyImageIcon && <CopyImageIcon className="size-4" />}
            {editorCommandConfig.copyImage.label}
          </CommandItem>
          <CommandItem onSelect={handleExportImage}>
            {ExportImageIcon && <ExportImageIcon className="size-4" />}
            {editorCommandConfig.exportImage.label}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="外观设置">
          <CommandItem onSelect={handleThemeToggle}>
            {ThemeIcon && <ThemeIcon className="size-4" />}
            {isDark ? editorCommandConfig.themeToggle.labelDark : editorCommandConfig.themeToggle.labelLight}
          </CommandItem>
          <CommandItem onSelect={handleMobileView} data-checked={isMobileView}>
            {MobileIcon && <MobileIcon className="size-4" />}
            {viewModeConfig.mobile.label}
          </CommandItem>
          <CommandItem onSelect={handleDesktopView} data-checked={isDesktopView}>
            {DesktopIcon && <DesktopIcon className="size-4" />}
            {viewModeConfig.desktop.label}
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('markdownStyle')}>
            <Palette className="size-4" />
            排版样式
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('codeTheme')}>
            <Code className="size-4" />
            代码主题
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="导航">
          {navigationConfig.internal.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <CommandItem key={item.path} onSelect={() => handleNavigate(item.path)}>
                {Icon && <Icon className="size-4" />}
                {item.label}
              </CommandItem>
            )
          })}
          {navigationConfig.external.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <CommandItem key={item.url} onSelect={() => handleExternalLink(item.url)}>
                {Icon && <Icon className="size-4" />}
                {item.label}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </>
    )
  }

  const renderMarkdownStyleMenu = () => (
    <CommandGroup heading="排版样式">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {markdownStyles.map(style => (
        <CommandItem
          key={style.id}
          onSelect={() => handleSelectMarkdownStyle(style.id)}
          data-checked={markdownStyle === style.id}
        >
          <Palette className="size-4" />
          {style.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  const renderCodeThemeMenu = () => (
    <CommandGroup heading="代码主题">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {codeThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => handleSelectCodeTheme(theme.id)}
          data-checked={codeTheme === theme.id}
        >
          <Code className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="命令面板"
        description="搜索命令..."
      >
        <Command>
          <CommandInput placeholder="搜索命令..." />
          <CommandList>
            <CommandEmpty>未找到相关命令</CommandEmpty>
            {subMenu === null && renderMainMenu()}
            {subMenu === 'markdownStyle' && renderMarkdownStyleMenu()}
            {subMenu === 'codeTheme' && renderCodeThemeMenu()}
          </CommandList>
        </Command>
      </CommandDialog>
      <ResetContentDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} />
    </>
  )
}
