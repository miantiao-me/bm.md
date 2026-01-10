import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/message-port'
import { router } from './router'

const handler = new RPCHandler(router, {
  interceptors: [onError(console.error)],
})

handler.upgrade(globalThis.self as unknown as MessagePort)
