import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { INPUT_SIZE_ERROR, MAX_INPUT_SIZE } from '../constants'

export const lintDefinition = {
  name: 'lint',
  title: '校验并修复 Markdown',
  description: '使用 markdownlint 规则对 Markdown 内容进行规范校验，并自动修复可修复的问题。包括：统一标题层级、修复列表缩进、规范空行、移除行尾空格等。',
  inputSchema: z.object({
    markdown: z.string().max(MAX_INPUT_SIZE, INPUT_SIZE_ERROR).describe('要校验和修复的 Markdown 源文本'),
  }),
  outputSchema: z.object({
    result: z.string().describe('校验并自动修复后的 Markdown 文本'),
  }),
}

export async function lint({ markdown }: z.infer<typeof lintDefinition.inputSchema>) {
  try {
    const { lint } = await import('./markdown')
    return lint(markdown)
  }
  catch (error) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', error)
  }
}

export const handler = os
  .route({
    method: 'POST',
    path: '/markdown/lint',
  })
  .input(lintDefinition.inputSchema)
  .output(lintDefinition.outputSchema)
  .handler(async ({ input }) => ({
    result: await lint(input),
  }))
