import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKDOWN_STYLE_ID, markdownStyleIds, markdownStyles, resolveDiagramFontFamily } from './metadata'

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

describe('图表字体族', () => {
  it.each(['kami', 'botanical', 'newsprint'] as const)('衬线风格 %s 解析为 serif', (id) => {
    expect(resolveDiagramFontFamily(id)).toBe('serif')
  })

  it.each(['bauhaus', 'blueprint', 'retro', 'sketch', 'terminal'] as const)('无衬线风格 %s 解析为 sans-serif', (id) => {
    expect(resolveDiagramFontFamily(id)).toBe('sans-serif')
  })

  it('未知与缺失 styleId 按默认主题 Kami 回退到 serif', () => {
    expect(resolveDiagramFontFamily(undefined)).toBe('serif')
    expect(resolveDiagramFontFamily(null)).toBe('serif')
    expect(resolveDiagramFontFamily('not-a-style')).toBe('serif')
  })
})
