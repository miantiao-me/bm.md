import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { JSONRPCRequest, JSONRPCResponse } from '@modelcontextprotocol/sdk/types.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

export async function handleMcpRequest(
  request: Request,
  server: McpServer,
): Promise<Response> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  try {
    const jsonRpcRequest = (await request.json()) as JSONRPCRequest

    const responseData = new Promise<JSONRPCResponse>((resolve, reject) => {
      if (jsonRpcRequest.method?.startsWith('notifications/')) {
        resolve(null as unknown as JSONRPCResponse)
      }
      const timeout = setTimeout(() => reject(new Error('Timeout')), 9_000)
      clientTransport.onmessage = (message: JSONRPCResponse) => {
        clearTimeout(timeout)
        resolve(message)
      }
    })

    await server.connect(serverTransport)

    await clientTransport.start()
    await serverTransport.start()

    await clientTransport.send(jsonRpcRequest)

    return Response.json(await responseData, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  catch (error) {
    console.error('MCP handler error:', error)

    // Return a JSON-RPC error response
    return Response.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
  finally {
    await Promise.all([
      clientTransport.close(),
      serverTransport.close(),
    ])
  }
}
