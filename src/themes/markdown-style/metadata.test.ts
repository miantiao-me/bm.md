import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKDOWN_STYLE_ID, markdownStyleIds, markdownStyles } from './metadata'

const KEPT_STYLE_IDS = [
  'kami',
  'bauhaus',
  'blueprint',
  'botanical',
  'newsprint',
  'retro',
  'sketch',
  'terminal',
] as const

const REMOVED_STYLE_IDS = [
  'ayu-light',
  'green-simple',
  'maximalism',
  'neo-brutalism',
  'organic',
  'playful-geometric',
  'professional',
] as const

describe('markdown style 注册表', () => {
  it('默认主题为 Kami', () => {
    expect(DEFAULT_MARKDOWN_STYLE_ID).toBe('kami')
  })

  it('保留 8 个主题且 Kami 位于首位', () => {
    expect(markdownStyleIds).toEqual([...KEPT_STYLE_IDS])
    expect(markdownStyles.map(style => style.id)).toEqual([...KEPT_STYLE_IDS])
  })

  it.each(REMOVED_STYLE_IDS)('注册列表不含已删除 ID %s', (id) => {
    expect(markdownStyleIds).not.toContain(id)
  })
})
