import type { NitroPreset } from 'nitro/types'
import { join } from 'node:path'

export default <NitroPreset>{
  extends: 'base-worker',
  // 让 SSR 与 Worker 构建选择依赖的服务端导出，不影响浏览器构建。
  exportConditions: ['worker'],
  alias: {
    // 保留流式 SSR，避免 browser 入口的 MessageChannel 阻止本地预渲染进程退出。
    'react-dom/server': 'react-dom/server.edge',
  },
  minify: false,
  entry: join(__dirname, 'entry.ts'),
  output: {
    dir: 'dist',
    serverDir: 'dist/server',
    publicDir: 'dist/client',
  },
  commands: {
    preview: 'esa-cli dev',
  },
  wasm: { lazy: true },
  rolldownConfig: {
    // 避免 Node 的 createRequire 注入与 unenv shim 形成初始化循环。
    platform: 'neutral',
  },
  rollupConfig: {
    output: {
      format: 'module',
      entryFileNames: 'server.js',
      strictExecutionOrder: true,
    },
  },
}
