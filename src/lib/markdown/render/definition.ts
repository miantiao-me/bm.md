import type { CliDefinition } from '../types/definition'
import * as z from 'zod'
import { codeThemeIds } from '@/themes/code-theme/metadata'
import { infographicPaletteIds, infographicThemeIds } from '@/themes/infographic-theme'
import { DEFAULT_MARKDOWN_STYLE_ID, markdownStyleIds } from '@/themes/markdown-style/metadata'
import { mermaidThemeIds } from '@/themes/mermaid-theme'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'
import { outputOption } from '../types/definition'
import { platforms } from './adapters'

const platformSchema = z.enum(platforms)
const markdownStyleSchema = z.enum(markdownStyleIds)
const codeThemeSchema = z.enum(codeThemeIds)
const mermaidThemeSchema = z.enum(mermaidThemeIds)
const infographicThemeSchema = z.enum(infographicThemeIds)
const infographicPaletteSchema = z.enum(infographicPaletteIds)

export const renderDefinition = {
  name: 'render' as const,
  title: '渲染 Markdown 为 HTML',
  description: '将 Markdown 内容渲染为适用于不同平台的 HTML 片段。支持 GFM 语法、数学公式（KaTeX）、代码高亮，并自动将 CSS 样式内联到元素上，确保在微信公众号等富文本编辑器中正确显示。',
  inputSchema: z.object({
    markdown: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('要渲染的 Markdown 源文本，支持 GFM（GitHub Flavored Markdown）语法、数学公式（$..$ 或 $$..$$）'),
    markdownStyle: markdownStyleSchema.optional().default(DEFAULT_MARKDOWN_STYLE_ID).describe('Markdown 排版样式 ID'),
    codeTheme: codeThemeSchema.optional().default('kimbie-light').describe('代码块高亮主题 ID'),
    mermaidTheme: mermaidThemeSchema.optional().default('').describe('Mermaid 流程图主题 ID，空字符串表示使用默认主题'),
    infographicTheme: infographicThemeSchema.optional().default('default').describe('Infographic 信息图主题 ID'),
    infographicPalette: infographicPaletteSchema.optional().default('antv').describe('Infographic 信息图配色 ID'),
    customCss: z.string().max(50000, '自定义 CSS 不能超过 50000 字符').optional().default('').describe('自定义 CSS 样式，在主题样式之后应用。选择器需约束在 #bm-md 下，例如：#bm-md h1 { color: red; }'),
    enableFootnoteLinks: z.boolean().optional().default(true).describe('是否将文中链接自动转换为脚注形式，便于阅读时查看原始链接'),
    openLinksInNewWindow: z.boolean().optional().default(true).describe('是否为所有外部链接添加 target="_blank"，在新窗口打开'),
    platform: platformSchema.optional().default('html').describe('目标发布平台。wechat 会进行微信公众号适配，html 使用通用 HTML 输出'),
    footnoteLabel: z.string().max(50).optional().default('Footnotes').describe('GFM 脚注区域标题'),
    referenceTitle: z.string().max(50).optional().default('References').describe('外部链接参考区域标题'),
  }),
  outputSchema: z.object({
    result: z.string().describe('渲染后的 HTML 片段，CSS 样式已内联到元素上，可直接复制粘贴到富文本编辑器'),
  }),
  cli: {
    inputField: 'markdown',
    inputLabel: 'file',
    options: [
      outputOption,
      { name: 'platform', description: '目标发布平台', type: 'string', choices: platforms, valueName: 'platform' },
      { name: 'markdownStyle', description: 'Markdown 排版样式 ID', type: 'string', choices: markdownStyleIds, valueName: 'id' },
      { name: 'codeTheme', description: '代码块高亮主题 ID', type: 'string', choices: codeThemeIds, valueName: 'id' },
      { name: 'mermaidTheme', description: 'Mermaid 流程图主题 ID，留空表示使用默认主题', type: 'string', choices: mermaidThemeIds, valueName: 'id' },
      { name: 'infographicTheme', description: 'Infographic 信息图主题 ID', type: 'string', choices: infographicThemeIds, valueName: 'id' },
      { name: 'infographicPalette', description: 'Infographic 信息图配色 ID', type: 'string', choices: infographicPaletteIds, valueName: 'id' },
      { name: 'customCss', description: '追加自定义 CSS', type: 'string', valueName: 'css' },
      { name: 'customCssFile', description: '从文件追加自定义 CSS', type: 'string', input: false, valueName: 'file' },
      { name: 'enableFootnoteLinks', description: '关闭文中链接脚注转换', type: 'boolean', cliKey: 'footnoteLinks', flag: 'no-footnote-links' },
      { name: 'openLinksInNewWindow', description: '关闭外部链接新窗口打开', type: 'boolean', cliKey: 'openLinks', flag: 'no-open-links' },
      { name: 'footnoteLabel', description: 'GFM 脚注区域标题', type: 'string', valueName: 'text' },
      { name: 'referenceTitle', description: '外部链接参考区域标题', type: 'string', valueName: 'text' },
    ],
  } satisfies CliDefinition,
}
