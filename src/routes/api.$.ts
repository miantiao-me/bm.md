import { createFileRoute } from '@tanstack/react-router'
import { handler } from '@/lib/markdown/api'

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { matched, response } = await handler.handle(request, {
          prefix: '/api',
          context: { headers: request.headers },
        })

        if (matched) {
          return response
        }

        return Response.json({ error: 'Not Found' }, { status: 404 })
      },
    },
  },
})
