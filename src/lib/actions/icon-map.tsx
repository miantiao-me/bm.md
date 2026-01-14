import type { ComponentType } from 'react'
import {
  BookOpen,
  Code,
  Code2,
  Coffee,
  ExternalLink,
  FileDown,
  FileUp,
  Github,
  ImageDown,
  Link,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Smartphone,
  Sun,
  Twitter,
  Wand,
} from 'lucide-react'
import JuejinIcon from '@/icons/juejin'
import MCPIcon from '@/icons/mcp'
import SkillIcon from '@/icons/skill'
import WechatIcon from '@/icons/wechat'
import ZhihuIcon from '@/icons/zhihu'

const iconMap = {
  BookOpen,
  Code,
  Code2,
  Coffee,
  ExternalLink,
  FileDown,
  FileUp,
  Github,
  ImageDown,
  Link,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Smartphone,
  Sun,
  Twitter,
  Wand,
  Wechat: WechatIcon,
  Zhihu: ZhihuIcon,
  Juejin: JuejinIcon,
  MCP: MCPIcon,
  Skill: SkillIcon,
} as const

export type IconName = keyof typeof iconMap

export type IconComponent = ComponentType<{ className?: string }>

export function getIcon(name: IconName): IconComponent {
  return iconMap[name]
}

export { iconMap }
