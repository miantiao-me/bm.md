import type { Plugin } from 'unified'
import type { Platform, PlatformAdapter } from './types'
import { juejinAdapter } from './juejin'
import { wechatAdapter } from './wechat'
import { zhihuAdapter } from './zhihu'

const htmlAdapter: PlatformAdapter = {
  id: 'html',
  name: 'HTML',
  plugins: [],
}

const adapters: Record<Platform, PlatformAdapter> = {
  html: htmlAdapter,
  wechat: wechatAdapter,
  zhihu: zhihuAdapter,
  juejin: juejinAdapter,
}

export function getAdapterPlugins(platform: Platform): Plugin[] {
  return adapters[platform].plugins
}

export { type Platform, type PlatformAdapter, platforms } from './types'
