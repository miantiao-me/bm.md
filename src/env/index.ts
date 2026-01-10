/* eslint-disable node/prefer-global/process */

/**
 * 极简版 env 管理
 * - PUBLIC：VITE_ 前缀，打包时由 Vite 内联替换，客户端可用
 * - PRIVATE：运行时惰性读取，不会泄露到客户端，仅服务端可用
 */

function getPrivate(key: string): string | undefined {
  // 优先从 EdgeKV 缓存获取
  if (globalThis.edgeKVCache && key in globalThis.edgeKVCache) {
    return globalThis.edgeKVCache[key] as string
  }
  // 从 process.env 获取
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key]
  }
  return undefined
}

export const env = {
  // PUBLIC（客户端可用，打包时内联）
  VITE_APP_URL: import.meta.env.VITE_APP_URL as string | undefined,
  VITE_API_URL: import.meta.env.VITE_API_URL as string | undefined,

  // PRIVATE（仅服务端可用，getter 惰性读取）
  get S3_ENDPOINT() { return getPrivate('S3_ENDPOINT') },
  get S3_BUCKET() { return getPrivate('S3_BUCKET') },
  get S3_ACCESS_KEY_ID() { return getPrivate('S3_ACCESS_KEY_ID') },
  get S3_SECRET_ACCESS_KEY() { return getPrivate('S3_SECRET_ACCESS_KEY') },
  get S3_REGION() { return getPrivate('S3_REGION') },
  get S3_PUBLIC_BASE_URL() { return getPrivate('S3_PUBLIC_BASE_URL') },

  // DC 图床配置
  get DC_UPLOAD_URL() { return getPrivate('DC_UPLOAD_URL') },

  // 统计分析（服务端运行时读取，支持 Docker 运行时配置）
  get ANALYTICS_SCRIPT_URL() { return getPrivate('ANALYTICS_SCRIPT_URL') },
  get ANALYTICS_SITE_ID() { return getPrivate('ANALYTICS_SITE_ID') },
}
