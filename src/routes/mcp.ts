import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createFileRoute } from '@tanstack/react-router'
import { extract, extractDefinition } from '@/lib/markdown/extract'
import { lint, lintDefinition } from '@/lib/markdown/lint'
import { parse, parseDefinition } from '@/lib/markdown/parse'
import { render, renderDefinition } from '@/lib/markdown/render'
import { name, version } from '@/package.json'
import { handleMcpRequest } from '@/utils/mcp-handler'

const server = new McpServer({
  name,
  version,
})

server.registerTool(
  extractDefinition.name,
  extractDefinition,
  async (input) => {
    const output = {
      result: await extract(input),
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output,
    }
  },
)

server.registerTool(
  lintDefinition.name,
  lintDefinition,
  async (input) => {
    const output = {
      result: await lint(input),
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output,
    }
  },
)

server.registerTool(
  parseDefinition.name,
  parseDefinition,
  async (input) => {
    const output = {
      result: await parse(input),
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output,
    }
  },
)

server.registerTool(
  renderDefinition.name,
  renderDefinition,
  async (input) => {
    const output = {
      result: await render(input),
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output,
    }
  },
)

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: async ({ request }) => handleMcpRequest(request, server),
    },
  },
})
