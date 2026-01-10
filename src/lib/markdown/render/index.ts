import { ORPCError, os } from '@orpc/server'
import z from 'zod'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'
import { platforms } from './adapters'
import html from './html'

export const platformSchema = z.enum(platforms)

export const renderDefinition = {
  name: 'render',
  title: '渲染 Markdown 为 HTML',
  description: '将 Markdown 内容渲染为适用于不同平台的 HTML 片段。支持 GFM 语法、数学公式（KaTeX）、代码高亮，并自动将 CSS 样式内联到元素上，确保在微信公众号等富文本编辑器中正确显示。',
  inputSchema: z.object({
    markdown: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('要渲染的 Markdown 源文本，支持 GFM（GitHub Flavored Markdown）语法、数学公式（$..$ 或 $$..$$）'),
    markdownStyle: z.string().optional().default('ayu-light').describe('Markdown 排版样式 ID。可选值: ayu-light'),
    codeTheme: z.string().optional().default('kimbie-light').describe('代码块高亮主题 ID。可选值: tokyo-night-light, tokyo-night-dark, panda-syntax-light, panda-syntax-dark, rose-pine-dawn, rose-pine, kimbie-light, kimbie-dark, paraiso-light, paraiso-dark'),
    enableFootnoteLinks: z.boolean().optional().default(true).describe('是否将文中链接自动转换为脚注形式，便于阅读时查看原始链接'),
    openLinksInNewWindow: z.boolean().optional().default(true).describe('是否为所有外部链接添加 target="_blank"，在新窗口打开'),
    platform: platformSchema.optional().default('html').describe('目标发布平台，会针对平台特性进行适配优化。可选值: html（通用网页）, wechat（微信公众号）, zhihu（知乎专栏）, juejin（掘金）'),
  }),
  outputSchema: z.object({
    result: z.string().describe('渲染后的 HTML 片段，CSS 样式已内联到元素上，可直接复制粘贴到富文本编辑器'),
  }),
}

export async function render(input: z.infer<typeof renderDefinition.inputSchema>) {
  try {
    return html(input)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/render',
  })
  .input(renderDefinition.inputSchema)
  .output(renderDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await render(input),
  }))
