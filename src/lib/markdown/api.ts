import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { onError } from '@orpc/server'
import { CORSPlugin } from '@orpc/server/plugins'
import { router } from './router'

export const handler = new OpenAPIHandler(router, {
  plugins: [new CORSPlugin()],
  interceptors: [onError(console.error)],
})
