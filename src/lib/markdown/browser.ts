import type { RouterClient } from '@orpc/server'
import type { workerRouter } from './router'
import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import { logSafeError } from '@/lib/log-safe-error'

type Client = RouterClient<typeof workerRouter>

let workerPromise: Promise<Client> | null = null

function getWorker() {
  if (workerPromise)
    return workerPromise

  const initialization = (async () => {
    // 动态导入 Worker，避免 SSR 时执行
    const { default: MarkdownWorker } = await import('./worker?worker')
    const link = new RPCLink({
      port: new MarkdownWorker(),
      interceptors: [onError(error => logSafeError('Markdown browser RPC error', error))],
    })
    return createORPCClient(link) as Client
  })().catch((error) => {
    if (workerPromise === initialization)
      workerPromise = null
    throw error
  })
  workerPromise = initialization
  return initialization
}

export const markdown: Client['markdown'] = {
  render: (...input) => getWorker().then(w => w.markdown.render(...input)),
  preview: (...input) => getWorker().then(w => w.markdown.preview(...input)),
  parse: (...input) => getWorker().then(w => w.markdown.parse(...input)),
  extract: (...input) => getWorker().then(w => w.markdown.extract(...input)),
  lint: (...input) => getWorker().then(w => w.markdown.lint(...input)),
}

export const worker: { prepare: () => Promise<Client> } = {
  prepare: () => getWorker(),
}
