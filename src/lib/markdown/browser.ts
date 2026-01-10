import type { RouterClient } from '@orpc/server'
import type { router } from './router'
import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'

type Client = RouterClient<typeof router>

let workerPromise: Promise<Client> | null = null

function getWorker() {
  return workerPromise ??= (async () => {
    // 动态导入 Worker，避免 SSR 时执行
    const { default: MarkdownWorker } = await import('./worker?worker')
    const link = new RPCLink({
      port: new MarkdownWorker(),
      interceptors: [onError(console.error)],
    })
    return createORPCClient(link) as Client
  })()
}

export const markdown: Client['markdown'] = {
  render: (...input) => getWorker().then(w => w.markdown.render(...input)),
  parse: (...input) => getWorker().then(w => w.markdown.parse(...input)),
  extract: (...input) => getWorker().then(w => w.markdown.extract(...input)),
  lint: (...input) => getWorker().then(w => w.markdown.lint(...input)),
}

export const worker: { prepare: () => Promise<Client> } = {
  prepare: () => getWorker(),
}
