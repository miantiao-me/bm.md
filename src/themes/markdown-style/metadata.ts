export interface MarkdownStyle {
  id: string
  name: string
  /** 一句话风格描述，用于样式画廊弹窗与下拉菜单提示 */
  description: string
}

export const markdownStyles = [
  { id: 'kami', name: 'Kami', description: '羊皮纸长文排版，适合报告与长篇阅读（默认）' },
  { id: 'bauhaus', name: 'Bauhaus', description: '几何色块讲义，适合设计讲义与产品宣言' },
  { id: 'blueprint', name: 'Blueprint', description: '冷静的技术规格书，适合 API 文档与工程手册' },
  { id: 'botanical', name: 'Botanical', description: '留白舒展的宋体散文，适合随笔与读书笔记' },
  { id: 'newsprint', name: 'Newsprint', description: '粗衬线报纸特稿，适合新闻评论与深度报道' },
  { id: 'retro', name: 'Retro', description: '暖色老派平装书，适合小说与回忆录' },
  { id: 'sketch', name: 'Sketch', description: '波浪线草稿本，适合课堂笔记与思路草稿' },
  { id: 'terminal', name: 'Terminal', description: '低眩光深色终端，适合 CLI 文档与运维手册' },
  { id: 'forest-review', name: 'Forest Review', description: '黑体标题配宋体正文，适合书评与文化专栏' },
  { id: 'navy-vellum', name: 'Navy Vellum', description: '藏蓝深色全宋体，适合论文笔记与夜间长读' },
  { id: 'rose-nocturne', name: 'Rose Nocturne', description: '紫黑底配宋体大标题，适合艺术评论与品牌故事' },
  { id: 'solar-catalog', name: 'Solar Catalog', description: '大标题展签式图录，适合作品集与展览介绍' },
  { id: 'triad-paper', name: 'Triad Paper', description: 'Riso 三色套印，适合独立刊物与活动手册' },
  { id: 'field-tablet', name: 'Field Tablet', description: '紧凑的档案卡笔记，适合调研记录与考察报告' },
  { id: 'public-square', name: 'Public Square', description: '大字粗黑告示，适合公告与倡议书' },
  { id: 'pixel-orbit', name: 'Pixel Orbit', description: '深色像素边框，适合游戏攻略与开发日志' },
] as const satisfies readonly MarkdownStyle[]

export type MarkdownStyleId = (typeof markdownStyles)[number]['id']

export const markdownStyleIds = markdownStyles.map(style => style.id) as [
  MarkdownStyleId,
  ...MarkdownStyleId[],
]

export const DEFAULT_MARKDOWN_STYLE_ID = 'kami' satisfies MarkdownStyleId

/** 正文或标题以衬线为主的排版风格，其余现有样式一律按无衬线处理 */
const SERIF_STYLE_IDS = new Set<string>(['kami', 'newsprint', 'botanical', 'retro', 'forest-review', 'navy-vellum'])

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
