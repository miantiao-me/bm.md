import type { CommandPaletteSubMenu } from './shared-data'
import type { CommandPaletteActions } from './use-command-palette-actions'
import {
  ChevronRight,
  Code,
  FilePlus,
  ImageIcon,
  Palette,
  PaletteIcon,
  RotateCcw,
  Workflow,
} from 'lucide-react'
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { editorCommandConfig, viewModeConfig } from '@/config'
import { HotkeyShortcut } from './shared'
import {
  CopyImageCommandIcon,
  DesktopViewIcon,
  editorSettingsItems,
  ExportCommandIcon,
  ExportImageCommandIcon,
  ExportPdfCommandIcon,
  externalNavigationItems,
  FormatCommandIcon,
  ImportCommandIcon,
  internalNavigationItems,
  MobileViewIcon,
  platformItems,
  PrintPreviewCommandIcon,
  ThemeDarkCommandIcon,
  ThemeLightCommandIcon,
} from './shared-data'

interface MainMenuProps {
  actions: CommandPaletteActions
  setSubMenu: (subMenu: CommandPaletteSubMenu) => void
}

export function MainMenu({ actions, setSubMenu }: MainMenuProps) {
  return (
    <>
      <EditorCommandsGroup actions={actions} />
      <CommandSeparator />
      <EditorSettingsGroup actions={actions} />
      <CommandSeparator />
      <CopyExportGroup actions={actions} />
      <CommandSeparator />
      <AppearanceGroup actions={actions} setSubMenu={setSubMenu} />
      <CommandSeparator />
      <NavigationGroup actions={actions} />
    </>
  )
}

function EditorCommandsGroup({ actions }: { actions: CommandPaletteActions }) {
  return (
    <CommandGroup heading="编辑器">
      <CommandItem onSelect={actions.handleNewFile}>
        <FilePlus className="size-4" />
        新建文件
      </CommandItem>
      <CommandItem onSelect={actions.handleImport}>
        <ImportCommandIcon className="size-4" />
        {editorCommandConfig.import.label}
        <HotkeyShortcut hotkey={editorCommandConfig.import.hotkey} />
      </CommandItem>
      <CommandItem onSelect={actions.handleExport}>
        <ExportCommandIcon className="size-4" />
        {editorCommandConfig.export.label}
        <HotkeyShortcut hotkey={editorCommandConfig.export.hotkey} />
      </CommandItem>
      <CommandItem onSelect={actions.handleFormat}>
        <FormatCommandIcon className="size-4" />
        {editorCommandConfig.format.label}
        <HotkeyShortcut hotkey={editorCommandConfig.format.hotkey} />
      </CommandItem>
      <CommandItem onSelect={actions.handleOpenResetDialog}>
        <RotateCcw className="size-4" />
        重置内容
      </CommandItem>
    </CommandGroup>
  )
}

function EditorSettingsGroup({ actions }: { actions: CommandPaletteActions }) {
  return (
    <CommandGroup heading="编辑器设置">
      {editorSettingsItems.map((item) => {
        const isChecked = actions.isSettingEnabled(item.storeKey)
        return (
          <CommandItem
            key={item.id}
            onSelect={() => actions.handleToggleSetting(item.storeKey, item.setterKey)}
            data-checked={isChecked}
          >
            <item.Icon className="size-4" />
            {item.label}
            <span className="sr-only">{isChecked ? '，已启用' : '，已关闭'}</span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

function CopyExportGroup({ actions }: { actions: CommandPaletteActions }) {
  return (
    <CommandGroup heading="复制导出">
      {platformItems.map(item => (
        <CommandItem key={item.platform} onSelect={actions.handleCopyPlatform(item.platform)}>
          <item.Icon className="size-4" />
          {item.config.label}
          <HotkeyShortcut hotkey={item.config.hotkey} />
        </CommandItem>
      ))}
      <CommandItem onSelect={actions.handleCopyImage}>
        <CopyImageCommandIcon className="size-4" />
        {editorCommandConfig.copyImage.label}
      </CommandItem>
      <CommandItem onSelect={actions.handleExportImage}>
        <ExportImageCommandIcon className="size-4" />
        {editorCommandConfig.exportImage.label}
      </CommandItem>
      <CommandItem onSelect={actions.handleExportPdf}>
        <ExportPdfCommandIcon className="size-4" />
        {editorCommandConfig.exportPdf.label}
      </CommandItem>
      <CommandItem onSelect={actions.handlePrintPreview}>
        <PrintPreviewCommandIcon className="size-4" />
        {editorCommandConfig.printPreview.label}
      </CommandItem>
    </CommandGroup>
  )
}

function AppearanceGroup({ actions, setSubMenu }: MainMenuProps) {
  return (
    <CommandGroup heading="外观设置">
      <CommandItem onSelect={actions.handleThemeToggle}>
        {actions.isDark
          ? <ThemeDarkCommandIcon className="size-4" />
          : <ThemeLightCommandIcon className="size-4" />}
        {actions.isDark ? editorCommandConfig.themeToggle.labelDark : editorCommandConfig.themeToggle.labelLight}
      </CommandItem>
      <CommandItem onSelect={actions.handleMobileView} data-checked={actions.isMobileView}>
        <MobileViewIcon className="size-4" />
        {viewModeConfig.mobile.label}
        {actions.isMobileView ? <span className="sr-only">，当前视图</span> : null}
      </CommandItem>
      <CommandItem onSelect={actions.handleDesktopView} data-checked={actions.isDesktopView}>
        <DesktopViewIcon className="size-4" />
        {viewModeConfig.desktop.label}
        {actions.isDesktopView ? <span className="sr-only">，当前视图</span> : null}
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
      <CommandItem onSelect={() => setSubMenu('mermaidTheme')}>
        <Workflow className="size-4" />
        流程图主题
        <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
      </CommandItem>
      <CommandItem onSelect={() => setSubMenu('infographicTheme')}>
        <ImageIcon className="size-4" />
        信息图主题
        <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
      </CommandItem>
      <CommandItem onSelect={() => setSubMenu('infographicPalette')}>
        <PaletteIcon className="size-4" />
        信息图色板
        <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
      </CommandItem>
    </CommandGroup>
  )
}

function NavigationGroup({ actions }: { actions: CommandPaletteActions }) {
  return (
    <CommandGroup heading="导航">
      {internalNavigationItems.map(item => (
        <CommandItem key={item.path} onSelect={() => actions.handleNavigate(item.path)}>
          <item.Icon className="size-4" />
          {item.label}
        </CommandItem>
      ))}
      {externalNavigationItems.map(item => (
        <CommandItem key={item.url} onSelect={() => actions.handleExternalLink(item.url)}>
          <item.Icon className="size-4" />
          {item.label}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
