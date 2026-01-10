import type { Plugin } from 'unified'

export const platforms = ['html', 'wechat', 'zhihu', 'juejin'] as const

export type Platform = typeof platforms[number]

export interface PlatformAdapter {
  id: Platform
  name: string
  plugins: Plugin[]
}
