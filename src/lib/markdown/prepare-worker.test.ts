import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('./browser')
})

it('预热等待实际初始化，并将失败交给调用方处理', async () => {
  let reject!: (error: Error) => void
  const pending = new Promise((_, rejectPromise) => {
    reject = rejectPromise
  })
  vi.doMock('./browser', () => ({ worker: { prepare: () => pending } }))
  const { prepareMarkdownWorker } = await import('./prepare-worker')
  const handled = vi.fn()
  const completion = prepareMarkdownWorker().catch(handled)
  await new Promise(resolve => setTimeout(resolve, 0))
  const error = new Error('预热失败')
  reject(error)
  await completion
  expect(handled).toHaveBeenCalledWith(error)
})
