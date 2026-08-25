export interface MarkdownStyle {
  id: string
  name: string
}

export const markdownStyles = [
  { id: 'kami', name: 'Kami' },
  { id: 'bauhaus', name: 'Bauhaus' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'botanical', name: 'Botanical' },
  { id: 'newsprint', name: 'Newsprint' },
  { id: 'retro', name: 'Retro' },
  { id: 'sketch', name: 'Sketch' },
  { id: 'terminal', name: 'Terminal' },
] as const satisfies readonly MarkdownStyle[]

export type MarkdownStyleId = (typeof markdownStyles)[number]['id']

export const markdownStyleIds = markdownStyles.map(style => style.id) as [
  MarkdownStyleId,
  ...MarkdownStyleId[],
]

export const DEFAULT_MARKDOWN_STYLE_ID = 'kami' satisfies MarkdownStyleId

/** 衬线排版风格集合，其余现有样式一律按无衬线处理 */
const SERIF_STYLE_IDS = new Set<string>(['kami', 'botanical', 'newsprint'])

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
