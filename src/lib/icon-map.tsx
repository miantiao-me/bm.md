import type { ComponentType } from 'react'
import {
  BookOpen,
  ClipboardCopy,
  Code,
  Code2,
  Coffee,
  ExternalLink,
  FileDown,
  FileText,
  FileUp,
  ImageDown,
  Link,
  Monitor,
  Moon,
  Palette,
  Printer,
  RefreshCw,
  ScanText,
  Smartphone,
  Sun,
  Wand,
  WrapText,
} from 'lucide-react'
import GithubIcon from '@/icons/github'
import MCPIcon from '@/icons/mcp'
import SkillIcon from '@/icons/skill'
import TwitterIcon from '@/icons/twitter'
import WechatIcon from '@/icons/wechat'

const iconMap = {
  BookOpen,
  ClipboardCopy,
  Code,
  Code2,
  Coffee,
  ExternalLink,
  FileDown,
  FileText,
  FileUp,
  Github: GithubIcon,
  ImageDown,
  Link,
  Monitor,
  Moon,
  Palette,
  Printer,
  RefreshCw,
  ScanText,
  Smartphone,
  Sun,
  Twitter: TwitterIcon,
  Wand,
  WrapText,
  Wechat: WechatIcon,
  MCP: MCPIcon,
  Skill: SkillIcon,
} as const

export type IconName = keyof typeof iconMap

export type IconComponent = ComponentType<{ className?: string }>

export function getIcon(name: IconName): IconComponent {
  return iconMap[name]
}

export { iconMap }
