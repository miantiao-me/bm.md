import server from 'node_modules/.nitro/vite/services/ssr/server.js'
import { preloadEdgeKVEnv } from './env'

export default {
  async fetch(request: Request) {
    await preloadEdgeKVEnv()
    // console.warn('Aliyun ESA fetch handler invoked')
    return server.fetch(request)
  },
}
