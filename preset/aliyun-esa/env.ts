import { env } from '@/env'

// 预加载 EdgeKV 中的环境变量（如果可用）
export async function preloadEdgeKVEnv() {
  if (!globalThis.edgeKVCache) {
    globalThis.edgeKVCache = {}
  }
  if (Object.keys(globalThis.edgeKVCache).length) {
    console.info('EdgeKV ENV already preloaded:', Object.keys(globalThis.edgeKVCache))
    // 已经预加载过，直接返回
    return
  }
  // @ts-expect-error EdgeKV 类型定义未包含在 Node.js 环境中
  if (typeof EdgeKV !== 'undefined') {
    try {
      // @ts-expect-error EdgeKV
      const edgeKV = new EdgeKV({ namespace: 'bm-md-env' })
      // 加载所有需要的环境变量
      await Promise.all(
        Object.keys(env)
          .filter(key => !key.startsWith('VITE_'))
          .map(async (key) => {
            const value = await edgeKV.get(key, { type: 'text' }).catch(() => null)
            if (value) {
              globalThis.edgeKVCache[key] = value
            }
          }),
      )
      console.info('EdgeKV ENV preload successfully:', Object.keys(globalThis.edgeKVCache))
    }
    catch (error) {
      console.warn('Failed to preload EdgeKV environment variables:', error)
    }
  }
}
