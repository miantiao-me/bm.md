import { createMiddleware } from '@tanstack/react-start'
import { env } from '@/env'

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = env.VITE_APP_URL || origin || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export const corsMiddleware = createMiddleware().server(async ({ request, next }) => {
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  const result = await next()

  const corsHeaders = getCorsHeaders(origin)
  for (const [key, value] of Object.entries(corsHeaders)) {
    result.response.headers.set(key, value)
  }

  return result
})
