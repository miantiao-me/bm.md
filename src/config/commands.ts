import type { IconName } from '@/lib/actions'
import type { EditorBooleanKey, EditorBooleanSetterKey } from '@/stores/editor'
import { appConfig } from './app'

// ========== 类型定义 ==========

interface HotkeyConfig {
  key: string
  shift: boolean
}

interface PlatformConfigItem {
  label: string
  successMessage: string
  icon: IconName
  hotkey: HotkeyConfig
}

interface EditorSettingItem {
  id: string
  label: string
  icon: IconName
  storeKey: EditorBooleanKey
  setterKey: EditorBooleanSetterKey
  separator?: boolean
}

interface ViewModeItem {
  label: string
  icon: IconName
}

interface InternalNavItem {
  path: string
  label: string
  icon: IconName
}

interface ExternalNavItem {
  url: string
  label: string
  icon: IconName
}

// ========== 平台配置 ==========

export const platformConfig = {
  wechat: {
    label: '复制为微信格式',
    successMessage: '已复制为微信格式',
    icon: 'Wechat',
    hotkey: { key: '7', shift: true },
  },
  zhihu: {
    label: '复制为知乎格式',
    successMessage: '已复制为知乎格式',
    icon: 'Zhihu',
    hotkey: { key: '8', shift: true },
  },
  juejin: {
    label: '复制为掘金格式',
    successMessage: '已复制为掘金格式',
    icon: 'Juejin',
    hotkey: { key: '9', shift: true },
  },
  html: {
    label: '复制 HTML',
    successMessage: '已复制 HTML',
    icon: 'Code2',
    hotkey: { key: '0', shift: true },
  },
} as const satisfies Record<string, PlatformConfigItem>

export type SupportedPlatform = keyof typeof platformConfig

export const supportedPlatforms = Object.keys(platformConfig) as SupportedPlatform[]

// ========== 编辑器命令配置 ==========

export const editorCommandConfig = {
  import: {
    label: '导入文件',
    icon: 'FileUp' as IconName,
    hotkey: { key: 'o', shift: false },
  },
  export: {
    label: '导出 Markdown',
    icon: 'FileDown' as IconName,
    hotkey: { key: 's', shift: false },
  },
  format: {
    label: '格式化内容',
    icon: 'Wand' as IconName,
    hotkey: { key: 'l', shift: true },
  },
  exportImage: {
    label: '导出图片',
    icon: 'ImageDown' as IconName,
  },
  copyImage: {
    label: '复制图片',
    icon: 'ClipboardCopy' as IconName,
  },
  themeToggle: {
    labelLight: '切换到深色模式',
    labelDark: '切换到浅色模式',
    iconLight: 'Moon' as IconName,
    iconDark: 'Sun' as IconName,
  },
} as const

// ========== 编辑器设置配置 ==========

export const editorSettingsConfig: readonly EditorSettingItem[] = [
  {
    id: 'footnoteLinks',
    label: '引用链接列表',
    icon: 'Link',
    storeKey: 'enableFootnoteLinks',
    setterKey: 'setEnableFootnoteLinks',
  },
  {
    id: 'openLinksInNewWindow',
    label: '新窗口打开链接',
    icon: 'ExternalLink',
    storeKey: 'openLinksInNewWindow',
    setterKey: 'setOpenLinksInNewWindow',
  },
  {
    id: 'scrollSync',
    label: '滚动同步',
    icon: 'RefreshCw',
    storeKey: 'enableScrollSync',
    setterKey: 'setEnableScrollSync',
    separator: true,
  },
]

// ========== 视图模式配置 ==========

export const viewModeConfig = {
  mobile: { label: '移动端视图', icon: 'Smartphone' },
  desktop: { label: '桌面端视图', icon: 'Monitor' },
} as const satisfies Record<string, ViewModeItem>

// ========== 导航配置 ==========

export const navigationConfig = {
  internal: [
    { path: '/docs/mcp', label: 'MCP 配置', icon: 'MCP' },
    { path: '/docs/skill', label: 'Skill 技能', icon: 'Skill' },
  ] as const satisfies readonly InternalNavItem[],
  external: [
    { url: '/docs', label: 'API 文档', icon: 'BookOpen' },
    { url: 'https://404.li/x', label: 'Twitter', icon: 'Twitter' },
    { url: appConfig.github, label: 'GitHub', icon: 'Github' },
    { url: 'https://404.li/coffee', label: '请喝咖啡', icon: 'Coffee' },
  ] as const satisfies readonly ExternalNavItem[],
}

// ========== 开发态快捷键冲突检测 ==========

if (import.meta.env.DEV) {
  const hotkeyToCommand = new Map<string, string>()

  const checkHotkey = (key: string, shift: boolean, command: string) => {
    const hotkeyId = `${shift ? 'shift+' : ''}${key.toLowerCase()}`
    if (hotkeyToCommand.has(hotkeyId)) {
      console.warn(
        `[bm.md] 快捷键冲突: Cmd/Ctrl+${hotkeyId.toUpperCase()} 同时绑定到 "${hotkeyToCommand.get(hotkeyId)}" 和 "${command}"`,
      )
    }
    hotkeyToCommand.set(hotkeyId, command)
  }

  Object.entries(platformConfig).forEach(([name, config]) => {
    checkHotkey(config.hotkey.key, config.hotkey.shift, `平台复制: ${name}`)
  })

  Object.entries(editorCommandConfig).forEach(([name, config]) => {
    if ('hotkey' in config) {
      checkHotkey(config.hotkey.key, config.hotkey.shift, `编辑器命令: ${name}`)
    }
  })
}
