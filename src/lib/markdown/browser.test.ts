import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type RpcMethod = (...input: unknown[]) => Promise<unknown>

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@orpc/client')
  vi.doUnmock('@orpc/client/message-port')
  vi.doUnmock('@/lib/log-safe-error')
  vi.doUnmock('./worker?worker')
})

describe('markdown browser RPC', () => {
  it('初始化失败后允许再次调用，并发初始化共用一次构造，RPC 失败不重置', async () => {
    const failure = new Error('初始化失败')
    const construct = vi.fn().mockImplementationOnce(() => {
      throw failure
    })
    const render = vi.fn().mockRejectedValueOnce(new Error('工具失败')).mockResolvedValue('成功')
    const client = { markdown: { render } }
    vi.doMock('./worker?worker', () => ({
      default: class {
        constructor() {
          construct()
        }
      },
    }))
    vi.doMock('@orpc/client/message-port', () => ({ RPCLink: class {} }))
    vi.doMock('@orpc/client', () => ({ createORPCClient: () => client, onError: vi.fn() }))
    const { markdown, worker } = await import('./browser')

    const first = worker.prepare()
    expect(worker.prepare()).toBe(first)
    await expect(first).rejects.toBe(failure)
    expect(construct).toHaveBeenCalledTimes(1)
    await expect(Promise.all([worker.prepare(), worker.prepare()])).resolves.toEqual([client, client])
    expect(construct).toHaveBeenCalledTimes(2)
    await expect(markdown.render({ markdown: '正文' })).rejects.toThrow('工具失败')
    await expect(markdown.render({ markdown: '正文' })).resolves.toBe('成功')
    expect(construct).toHaveBeenCalledTimes(2)
  })

  it('markdown 方法懒加载同一个 worker 客户端并转发调用', async () => {
    const interceptor = { name: 'browser-error-interceptor' }
    const workerPorts: Array<{ readonly kind: string }> = []
    const linkInstances: Array<{ readonly options: unknown }> = []
    const markdownClient = {
      render: vi.fn<RpcMethod>().mockResolvedValue('render-result'),
      preview: vi.fn<RpcMethod>().mockResolvedValue('preview-result'),
      parse: vi.fn<RpcMethod>().mockResolvedValue('parse-result'),
      extract: vi.fn<RpcMethod>().mockResolvedValue('extract-result'),
      lint: vi.fn<RpcMethod>().mockResolvedValue('lint-result'),
    }
    const client = { markdown: markdownClient }
    const markdownWorkerConstructor = vi.fn<() => void>()
    const rpcLinkConstructor = vi.fn<(options: unknown) => void>()
    const createORPCClient = vi.fn<(link: unknown) => typeof client>(() => client)
    const onError = vi.fn<(callback: (error: unknown) => void) => unknown>(() => interceptor)
    const logSafeError = vi.fn<(message: string, error: unknown) => void>()

    class MockMarkdownWorker {
      readonly kind = 'worker-port'

      constructor() {
        markdownWorkerConstructor()
        workerPorts.push(this)
      }
    }

    class MockRPCLink {
      readonly options: unknown

      constructor(options: unknown) {
        this.options = options
        rpcLinkConstructor(options)
        linkInstances.push(this)
      }
    }

    vi.doMock('./worker?worker', () => ({ default: MockMarkdownWorker }))
    vi.doMock('@orpc/client/message-port', () => ({ RPCLink: MockRPCLink }))
    vi.doMock('@orpc/client', () => ({ createORPCClient, onError }))
    vi.doMock('@/lib/log-safe-error', () => ({ logSafeError }))

    const { markdown, worker } = await import('./browser')

    expect(markdownWorkerConstructor).not.toHaveBeenCalled()
    expect(rpcLinkConstructor).not.toHaveBeenCalled()
    expect(createORPCClient).not.toHaveBeenCalled()

    const renderInput = { markdown: '# 标题' }
    const parseInput = { html: '<h1>标题</h1>' }
    const extractInput = { markdown: '**正文**' }
    const lintInput = { markdown: '#标题' }

    await expect(markdown.render(renderInput)).resolves.toBe('render-result')
    await expect(markdown.preview(renderInput)).resolves.toBe('preview-result')
    await expect(markdown.parse(parseInput)).resolves.toBe('parse-result')
    await expect(markdown.extract(extractInput)).resolves.toBe('extract-result')
    await expect(markdown.lint(lintInput)).resolves.toBe('lint-result')
    await expect(worker.prepare()).resolves.toBe(client)

    expect(markdownWorkerConstructor).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(rpcLinkConstructor).toHaveBeenCalledTimes(1)
    expect(rpcLinkConstructor).toHaveBeenCalledWith({
      port: workerPorts[0],
      interceptors: [interceptor],
    })
    expect(createORPCClient).toHaveBeenCalledTimes(1)
    expect(createORPCClient).toHaveBeenCalledWith(linkInstances[0])
    expect(markdownClient.render).toHaveBeenCalledWith(renderInput)
    expect(markdownClient.preview).toHaveBeenCalledWith(renderInput)
    expect(markdownClient.parse).toHaveBeenCalledWith(parseInput)
    expect(markdownClient.extract).toHaveBeenCalledWith(extractInput)
    expect(markdownClient.lint).toHaveBeenCalledWith(lintInput)
  })
})
