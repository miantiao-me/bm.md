import type { CallToolResult, ListToolsResult } from '@modelcontextprotocol/server'
import type { RouterClient } from '@orpc/server'
import type * as z from 'zod'
import type { parseDefinition, renderDefinition } from './definitions'
import type { McpResult } from '@/utils/mcp-test-helper'
import { afterAll, describe, expect, expectTypeOf, it } from 'vitest'

import { cliTools } from '@/cli/core'
import { createMcpHttpHandler } from '@/utils/mcp-handler'
import { createMcpRequest, readMcpJson } from '@/utils/mcp-test-helper'
import { markdownTools } from './definitions'
import { createMarkdownMcpServer } from './mcp'
import { router, workerRouter } from './router'

type ApiMarkdownClient = RouterClient<typeof router>['markdown']

const mcpHandler = createMcpHttpHandler(createMarkdownMcpServer)

afterAll(() => mcpHandler.close())

function sorted(values: readonly string[]) {
  return [...values].sort()
}

describe('markdown 工具集合契约', () => {
  it('registry 为四个工具同时绑定定义和执行函数', () => {
    expect(markdownTools).toHaveLength(4)

    for (const tool of markdownTools) {
      expect(tool.run).toBeTypeOf('function')
    }
  })

  it('cli、API router 与 registry 暴露完全相同的工具名', () => {
    const expectedNames = sorted(markdownTools.map(tool => tool.name))

    expect(cliTools).toBe(markdownTools)
    expect(sorted(cliTools.map(tool => tool.name))).toEqual(expectedNames)
    expect(sorted(Object.keys(router.markdown))).toEqual(expectedNames)
  })

  it('api router 保留每个工具的精确输入类型', () => {
    expectTypeOf<Parameters<ApiMarkdownClient['render']>[0]>()
      .toEqualTypeOf<z.input<typeof renderDefinition.inputSchema>>()
    expectTypeOf<Parameters<ApiMarkdownClient['parse']>[0]>()
      .toEqualTypeOf<z.input<typeof parseDefinition.inputSchema>>()
  })

  it('mcp 与 registry 暴露完全相同的工具名', async () => {
    const response = await createMcpRequest(
      mcpHandler,
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    )
    const data = await readMcpJson<McpResult<ListToolsResult>>(response)
    const expectedNames = sorted(markdownTools.map(tool => tool.name))

    expect(sorted(data.result.tools.map(tool => tool.name))).toEqual(expectedNames)
    const renderTool = data.result.tools.find(tool => tool.name === 'render')
    expect(renderTool?.inputSchema.properties?.breaks).toMatchObject({ type: 'boolean', default: false })
    expect(renderTool?.inputSchema.required ?? []).not.toContain('breaks')
  })

  it('worker 只比公开工具集合额外暴露 preview', () => {
    const expectedNames = sorted([
      ...markdownTools.map(tool => tool.name),
      'preview',
    ])

    expect(sorted(Object.keys(workerRouter.markdown))).toEqual(expectedNames)
  })

  it.each([undefined, false, true])('mcp render 支持 breaks=%s', async (breaks) => {
    const response = await createMcpRequest(mcpHandler, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'render',
        arguments: { markdown: '第一行\n第二行', ...(breaks === undefined ? {} : { breaks }) },
      },
    })
    const data = await readMcpJson<McpResult<CallToolResult>>(response)
    expect(data.result.isError).not.toBe(true)
    const text = data.result.content.filter(item => item.type === 'text').map(item => item.text).join('')
    expect(text).toContain('第一行')
    expect(/<br[\s>]/.test(text)).toBe(breaks === true)
  })
})
