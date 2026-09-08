export interface MarkdownStyle {
  id: string
  name: string
  /** 一句话风格描述，用于样式画廊弹窗与下拉菜单提示 */
  description: string
}

export const markdownStyles = [
  { id: 'kami', name: 'Kami', description: '简洁的纸张阅读风格（默认）' },
  { id: 'bauhaus', name: 'Bauhaus', description: '包豪斯风格，几何与功能主义' },
  { id: 'blueprint', name: 'Blueprint', description: '蓝图技术文档风格' },
  { id: 'botanical', name: 'Botanical', description: '植物园风格，自然柔和' },
  { id: 'newsprint', name: 'Newsprint', description: '报纸印刷风格' },
  { id: 'retro', name: 'Retro', description: '复古怀旧风格' },
  { id: 'sketch', name: 'Sketch', description: '手绘素描风格' },
  { id: 'terminal', name: 'Terminal', description: '终端/命令行风格' },
  { id: 'forest-review', name: 'Forest Review', description: '森林季报风格，暖调编辑排版' },
  { id: 'navy-vellum', name: 'Navy Vellum', description: '深蓝羊皮纸风格，静谧的学术手记' },
  { id: 'rose-nocturne', name: 'Rose Nocturne', description: '玫瑰夜曲风格，暗色调时尚编辑' },
  { id: 'solar-catalog', name: 'Solar Catalog', description: '日光图录风格，展览海报质感' },
  { id: 'triad-paper', name: 'Triad Paper', description: '三调纸面风格，三色时尚杂志感' },
  { id: 'field-tablet', name: 'Field Tablet', description: '田野铭牌风格，考古手册质感' },
  { id: 'public-square', name: 'Public Square', description: '公共广场风格，行动主义海报' },
  { id: 'pixel-orbit', name: 'Pixel Orbit', description: '像素轨道风格，复古像素街机' },
] as const satisfies readonly MarkdownStyle[]

export type MarkdownStyleId = (typeof markdownStyles)[number]['id']

export const markdownStyleIds = markdownStyles.map(style => style.id) as [
  MarkdownStyleId,
  ...MarkdownStyleId[],
]

export const DEFAULT_MARKDOWN_STYLE_ID = 'kami' satisfies MarkdownStyleId

/** 衬线排版风格集合，其余现有样式一律按无衬线处理 */
const SERIF_STYLE_IDS = new Set<string>(['kami', 'botanical', 'newsprint', 'forest-review'])

/**
 * 解析排版风格对应的图表字体族（仅 serif / sans-serif 两类）。
 * 图表文字随文档的衬线气质走；未知或缺失的 styleId 按默认主题 Kami 回退到 serif。
 */
export function resolveDiagramFontFamily(styleId: string | undefined | null): 'serif' | 'sans-serif' {
  const isKnownSansStyle = styleId != null
    && markdownStyles.some(style => style.id === styleId)
    && !SERIF_STYLE_IDS.has(styleId)
  return isKnownSansStyle ? 'sans-serif' : 'serif'
}
