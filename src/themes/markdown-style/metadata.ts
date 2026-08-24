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
