import type { DocumentWorkerResponse } from './protocol'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface WorkerListenerMap {
  message: (event: MessageEvent<DocumentWorkerResponse>) => void
  error: () => void
  messageerror: () => void
}

const workers: FakeWorker[] = []

class FakeWorker {
  static throwOnPost = false

  listeners: Partial<WorkerListenerMap> = {}

  postMessage = vi.fn(() => {
    if (FakeWorker.throwOnPost) {
      throw new Error('postMessage 失败')
    }
  })

  terminate = vi.fn()

  constructor() {
    workers.push(this)
  }

  addEventListener<T extends keyof WorkerListenerMap>(type: T, listener: WorkerListenerMap[T]) {
    this.listeners[type] = listener
  }

  removeEventListener<T extends keyof WorkerListenerMap>(type: T, _listener: WorkerListenerMap[T]) {
    delete this.listeners[type]
  }

  respond(response: DocumentWorkerResponse) {
    this.listeners.message?.({ data: response } as MessageEvent<DocumentWorkerResponse>)
  }

  fail(type: 'error' | 'messageerror' = 'error') {
    this.listeners[type]?.()
  }
}

beforeEach(() => {
  vi.resetModules()
  workers.length = 0
  FakeWorker.throwOnPost = false
  vi.doMock('./worker?worker', () => ({ default: FakeWorker }))
})

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('./worker?worker')
  vi.useRealTimers()
})

describe('document browser Worker', () => {
  it('懒加载 Worker 并直接转移 ArrayBuffer', async () => {
    const { convertDocument } = await import('./browser')
    const bytes = new ArrayBuffer(4)
    expect(workers).toHaveLength(0)

    const conversion = convertDocument({ bytes, formatHint: 'csv' })
    await vi.waitFor(() => expect(workers).toHaveLength(1))
    expect(workers[0].postMessage).toHaveBeenCalledWith(
      { bytes, formatHint: 'csv' },
      [bytes],
    )
    workers[0].respond({ success: true, markdown: '| 数据 |' })
    await expect(conversion).resolves.toBe('| 数据 |')
    expect(workers[0].listeners).toEqual({})
  })

  it('严格串行转换，失败后队列仍继续', async () => {
    const { convertDocument } = await import('./browser')
    const first = convertDocument({ bytes: new ArrayBuffer(1) })
    const second = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(1))

    workers[0].respond({ success: false, code: 'encrypted' })
    await expect(first).rejects.toMatchObject({ code: 'encrypted' })
    await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(2))
    workers[0].respond({ success: true, markdown: '第二份' })
    await expect(second).resolves.toBe('第二份')
    expect(workers).toHaveLength(1)
  })

  it('需要 OCR 时保留错误码、提示处理方式且不重建 Worker', async () => {
    const { convertDocument } = await import('./browser')
    const { getDocumentImportErrorMessage } = await import('./error')
    const conversion = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers).toHaveLength(1))

    workers[0].respond({ success: false, code: 'needsOcr' })
    await expect(conversion).rejects.toMatchObject({ code: 'needsOcr' })
    await conversion.catch((error) => {
      expect(getDocumentImportErrorMessage('扫描.pdf', error)).toBe(
        '文件需要文字识别（OCR），请先识别文字后再导入: 扫描.pdf',
      )
    })
    expect(workers[0].terminate).not.toHaveBeenCalled()
  })

  it.each(['runtime', 'error', 'messageerror'] as const)('%s 失败后重建 Worker', async (failure) => {
    const { convertDocument } = await import('./browser')
    const first = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers).toHaveLength(1))

    if (failure === 'runtime') {
      workers[0].respond({ success: false, code: 'runtime' })
    }
    else {
      workers[0].fail(failure)
    }
    await expect(first).rejects.toMatchObject({ code: 'runtime' })
    expect(workers[0].terminate).toHaveBeenCalledOnce()

    const second = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers).toHaveLength(2))
    workers[1].respond({ success: true, markdown: '成功' })
    await expect(second).resolves.toBe('成功')
  })

  it('超时后终止 Worker，并让排队项在新 Worker 成功', async () => {
    vi.useFakeTimers()
    const { convertDocument } = await import('./browser')
    const first = convertDocument({ bytes: new ArrayBuffer(1) })
    const second = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers).toHaveLength(1))

    await vi.advanceTimersByTimeAsync(120_000)
    await expect(first).rejects.toMatchObject({ code: 'runtime' })
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(workers).toHaveLength(2))
    workers[1].respond({ success: true, markdown: '排队成功' })

    await expect(second).resolves.toBe('排队成功')
    expect(workers[1].listeners).toEqual({})
  })

  it('postMessage 失败后可重建 Worker', async () => {
    FakeWorker.throwOnPost = true
    const { convertDocument } = await import('./browser')

    await expect(convertDocument({ bytes: new ArrayBuffer(1) })).rejects.toMatchObject({ code: 'runtime' })
    expect(workers[0].terminate).toHaveBeenCalledOnce()

    FakeWorker.throwOnPost = false
    const retry = convertDocument({ bytes: new ArrayBuffer(1) })
    await vi.waitFor(() => expect(workers).toHaveLength(2))
    workers[1].respond({ success: true, markdown: '重试成功' })
    await expect(retry).resolves.toBe('重试成功')
  })
})
