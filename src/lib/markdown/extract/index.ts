import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'

export const extractDefinition = {
  name: 'extract',
  title: '提取 Markdown 纯文本',
  description: '从 Markdown 文档中提取纯文本内容，移除所有格式标记（如标题符号、链接、图片、代码块等）。适用于字数统计、文本分析、生成摘要、或作为语音朗读的输入。',
  inputSchema: z.object({
    markdown: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('要提取文本的 Markdown 源文本'),
  }),
  outputSchema: z.object({
    result: z.string().describe('提取后的纯文本内容，保留段落分隔，已移除所有 Markdown 格式标记'),
  }),
}

export async function extract(input: z.infer<typeof extractDefinition.inputSchema>) {
  try {
    const { extract } = await import('./text')
    return extract(input.markdown)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/extract',
  })
  .input(extractDefinition.inputSchema)
  .output(extractDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await extract(input),
  }))
