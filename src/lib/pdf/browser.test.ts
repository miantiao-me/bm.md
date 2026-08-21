import type { PdfRenderInput, PdfWorkerResponse } from './protocol'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PdfBrowser, pdfErrorMessage, shouldPrintFallback } from './browser'
import { PdfError } from './protocol'

type Listener = (event: never) => void

class FakeWorker {
  readonly listeners = new Map<string, Set<Listener>>()
  readonly posts: Array<{ message: PdfRenderInput, transfer: Transferable[] }> = []
  terminated = false

  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  postMessage(message: PdfRenderInput, transfer: Transferable[]) {
    this.posts.push({ message: structuredClone(message, { transfer }), transfer })
  }

  terminate() {
    this.terminated = true
  }

  emit(type: string, data?: unknown) {
    const event = type === 'message' || type === 'messageerror'
      ? { data }
      : { error: data }
    this.listeners.get(type)?.forEach(listener => listener(event as never))
  }
}

function input(): PdfRenderInput {
  return {
    backgroundColor: '#fff',
    fontFamilies: ['Noto Sans SC'],
    html: '<div id="bm-md">正文</div>',
    images: [
      { src: 'https://example.com/a.png', data: new ArrayBuffer(1) },
      { src: 'https://example.com/b.png', data: new ArrayBuffer(2) },
    ],
    lang: 'zh-CN',
    stylesheets: [],
    title: '标题',
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('pdf browser Worker 协议', () => {
  it('传输图片，接收精确 PDF buffer', async () => {
    const worker = new FakeWorker()
    const browser = new PdfBrowser(() => worker as unknown as Worker)
    const renderInput = input()
    const pending = browser.render(renderInput)
    expect(worker.posts[0].transfer).toHaveLength(2)
    expect(renderInput.images.map(image => image.data.byteLength)).toEqual([0, 0])
    expect(worker.posts[0].message.images.map(image => image.data.byteLength)).toEqual([1, 2])

    const pdf = new ArrayBuffer(3)
    worker.emit('message', { success: true, pdf } satisfies PdfWorkerResponse)
    await expect(pending).resolves.toEqual({ pdf, replacements: [] })
  })

  it('missingGlyphs 返还图片后恢复并重新传输，本地维护 replacements', async () => {
    const worker = new FakeWorker()
    const returnedImages = [{ src: 'restored', data: new ArrayBuffer(4) }]
    const recover = vi.fn().mockImplementation((renderInput: PdfRenderInput) => {
      expect(renderInput.images).toBe(returnedImages)
      renderInput.html = '<div id="bm-md">□</div>'
      return {
        input: renderInput,
        probed: [],
        replacements: [{ original: '✅', codepoints: [0x2705] }],
      }
    })
    const browser = new PdfBrowser(() => worker as unknown as Worker, recover)
    const pending = browser.render(input())
    worker.emit('message', {
      success: false,
      kind: 'missingGlyphs',
      codepoints: [0x2705],
      images: returnedImages,
    } satisfies PdfWorkerResponse)

    await vi.waitFor(() => expect(worker.posts).toHaveLength(2))
    expect(worker.posts[1].transfer).toHaveLength(1)
    expect(returnedImages[0].data.byteLength).toBe(0)
    expect(worker.posts[1].message.images[0].data.byteLength).toBe(4)
    const pdf = new ArrayBuffer(2)
    worker.emit('message', { success: true, pdf } satisfies PdfWorkerResponse)
    await expect(pending).resolves.toEqual({
      pdf,
      replacements: [{ original: '✅', codepoints: [0x2705] }],
    })
  })

  it('探针后相同缺字没有进展时明确终止', async () => {
    const worker = new FakeWorker()
    const recover = vi.fn()
      .mockReturnValueOnce({ input: input(), probed: [0x251C], replacements: [] })
      .mockImplementationOnce(() => {
        throw new PdfError('renderFailed', '部分字符无法生成 PDF，请使用打印功能')
      })
    const browser = new PdfBrowser(() => worker as unknown as Worker, recover)
    const pending = browser.render(input())
    const missing: PdfWorkerResponse = {
      success: false,
      kind: 'missingGlyphs',
      codepoints: [0x251C],
      images: [{ src: 'restored', data: new ArrayBuffer(1) }],
    }
    worker.emit('message', missing)
    await vi.waitFor(() => expect(worker.posts).toHaveLength(2))
    worker.emit('message', missing)
    await expect(pending).rejects.toThrow('部分字符无法生成 PDF')
  })

  it.each([
    ['fontUnavailable', 'fontUnavailable'],
    ['renderFailed', 'renderFailed'],
  ] as const)('%s 终止错误不重试且不要求返还图片', async (responseKind, errorKind) => {
    const worker = new FakeWorker()
    const browser = new PdfBrowser(() => worker as unknown as Worker)
    const pending = browser.render(input())
    worker.emit('message', { success: false, kind: responseKind } satisfies PdfWorkerResponse)
    await expect(pending).rejects.toMatchObject({ kind: errorKind })
    expect(worker.posts).toHaveLength(1)
  })

  it('runtimeUnavailable 响应终止旧 Worker 并在下次调用重建', async () => {
    const workers: FakeWorker[] = []
    const browser = new PdfBrowser(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    })
    const first = browser.render(input())
    workers[0].emit('message', { success: false, kind: 'runtimeUnavailable' } satisfies PdfWorkerResponse)
    await expect(first).rejects.toMatchObject({ kind: 'runtimeUnavailable' })
    expect(workers[0].terminated).toBe(true)

    const second = browser.render(input())
    expect(workers).toHaveLength(2)
    workers[1].emit('message', { success: true, pdf: new ArrayBuffer(1) } satisfies PdfWorkerResponse)
    await second
  })

  it.each(['error', 'messageerror'] as const)('%s 后终止并重建 Worker', async (eventType) => {
    const workers: FakeWorker[] = []
    const browser = new PdfBrowser(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    })
    const first = browser.render(input())
    workers[0].emit(eventType, new Error('secret https://example.com/?token=1'))
    await expect(first).rejects.toMatchObject({ kind: 'runtimeUnavailable' })
    expect(workers[0].terminated).toBe(true)

    const second = browser.render(input())
    expect(workers).toHaveLength(2)
    workers[1].emit('message', { success: true, pdf: new ArrayBuffer(1) } satisfies PdfWorkerResponse)
    await second
  })

  it('timeout 后终止并在下次调用重建 Worker', async () => {
    vi.useFakeTimers()
    const workers: FakeWorker[] = []
    const browser = new PdfBrowser(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    }, undefined, 10)
    const first = browser.render(input())
    const rejection = expect(first).rejects.toMatchObject({ kind: 'runtimeUnavailable' })
    await vi.advanceTimersByTimeAsync(10)
    await rejection
    expect(workers[0].terminated).toBe(true)

    const second = browser.render(input())
    expect(workers).toHaveLength(2)
    workers[1].emit('message', { success: true, pdf: new ArrayBuffer(1) } satisfies PdfWorkerResponse)
    await second
  })

  it('用户文案不包含底层错误或 URL，字体和运行时错误保持打印降级', () => {
    for (const kind of ['fontUnavailable', 'runtimeUnavailable', 'renderFailed'] as const) {
      const message = pdfErrorMessage(kind)
      expect(message).not.toContain('https://')
      expect(message).not.toContain('Takumi')
      expect(message).not.toContain('Worker')
    }
    expect(shouldPrintFallback(new PdfError('fontUnavailable', 'secret data:image/png;base64,abc'))).toBe(true)
    expect(shouldPrintFallback(new PdfError('runtimeUnavailable', 'secret query=1'))).toBe(true)
    expect(shouldPrintFallback(new PdfError('renderFailed', 'secret'))).toBe(false)
  })
})
