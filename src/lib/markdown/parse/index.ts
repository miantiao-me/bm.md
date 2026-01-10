import { ORPCError, os } from '@orpc/server'
import z from 'zod'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'
import parseHtml from './html'

export const parseDefinition = {
  name: 'parse',
  title: '解析 HTML 为 Markdown',
  description: '将 HTML 内容反向转换为 Markdown 格式。适用于从网页复制内容、导入已有文章、或将富文本转换为 Markdown 进行编辑。会自动清理不安全的 HTML 标签。',
  inputSchema: z.object({
    html: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('要转换的 HTML 源代码，可以是完整文档或 HTML 片段'),
  }),
  outputSchema: z.object({
    result: z.string().describe('转换后的 Markdown 文本，使用 - 作为无序列表标记'),
  }),
}

export async function parse(input: z.infer<typeof parseDefinition.inputSchema>) {
  try {
    const markdown = await parseHtml(input.html)
    return markdown
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/parse',
  })
  .input(parseDefinition.inputSchema)
  .output(parseDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await parse(input),
  }))
