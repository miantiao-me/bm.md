import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadImages, resolveImageUrl } from './images'

const limits = { concurrency: 2, count: 3, imageBytes: 4, totalBytes: 8 }

function response(chunks: number[], cancel = vi.fn(), headers?: HeadersInit): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(size => controller.enqueue(new Uint8Array(size)))
      controller.close()
    },
    cancel,
  }), { headers })
}

function cancelableResponse(cancel: (reason?: unknown) => void | PromiseLike<void>, init?: ResponseInit): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(3))
    },
    cancel,
  }), init)
}

function openResponse(chunks: number[], cancel: (reason?: unknown) => void | PromiseLike<void>): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(size => controller.enqueue(new Uint8Array(size)))
    },
    cancel,
  }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('pdf 图片读取', () => {
  it('规范化图片地址且错误不泄露原始地址', () => {
    expect(resolveImageUrl('', '../a.png', 'https://example.com/docs/'))
      .toBe('https://example.com/a.png')
    expect(() => resolveImageUrl('', 'http://[invalid]/?secret=1', 'https://example.com/'))
      .toThrow('预览中存在无效图片')
    try {
      resolveImageUrl('', 'http://[data:image/png;base64,secret]', 'https://example.com/')
    }
    catch (error) {
      expect(String(error)).not.toContain('data:')
      expect(String(error)).not.toContain('not a url')
    }
  })

  it('非 2xx 与 Content-Length 超限都会取消响应体', async () => {
    const httpCancel = vi.fn()
    const sizeCancel = vi.fn()
    const fetchImage = vi.fn()
      .mockResolvedValueOnce(cancelableResponse(httpCancel, { status: 403 }))
      .mockResolvedValueOnce(cancelableResponse(sizeCancel, { headers: { 'content-length': '5' } }))

    await expect(loadImages(['https://example.com/http'], fetchImage, limits))
      .rejects
      .toThrow('部分图片无法读取')
    await expect(loadImages(['https://example.com/large'], fetchImage, limits))
      .rejects
      .toThrow('单张图片过大')
    expect(httpCancel).toHaveBeenCalledOnce()
    expect(sizeCancel).toHaveBeenCalledOnce()
  })

  it('无 Content-Length 时在单图和总量超限处立即取消', async () => {
    const imageCancel = vi.fn()
    await expect(loadImages(
      ['https://example.com/large'],
      vi.fn().mockResolvedValue(openResponse([3, 2], imageCancel)),
      limits,
    )).rejects.toThrow('单张图片过大')
    expect(imageCancel).toHaveBeenCalledOnce()

    const totalCancel = vi.fn()
    await expect(loadImages(
      ['https://example.com/a', 'https://example.com/b'],
      vi.fn()
        .mockResolvedValueOnce(response([4]))
        .mockResolvedValueOnce(openResponse([4, 1], totalCancel)),
      { ...limits, imageBytes: 6 },
    )).rejects.toThrow('图片总量过大')
    expect(totalCancel).toHaveBeenCalledOnce()
  })

  it('reader cancel 失败不掩盖原始超限错误', async () => {
    const cancel = vi.fn().mockRejectedValue(new Error('cancel failed'))
    await expect(loadImages(
      ['https://example.com/large'],
      vi.fn().mockResolvedValue(openResponse([3, 2], cancel)),
      limits,
    )).rejects.toMatchObject({
      kind: 'imagesFailed',
      message: '单张图片过大，请压缩到 20 MiB 以内',
    })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('读取超时会 abort fetch 并返回安全错误', async () => {
    vi.useFakeTimers()
    let aborted = false
    const fetchImage = vi.fn().mockImplementation((_url: string, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('secret url timed out', 'AbortError'))
        })
      })
    ))
    const pending = loadImages(
      ['https://example.com/slow?token=secret'],
      fetchImage,
      { ...limits, timeoutMs: 10 },
    )
    const rejection = expect(pending).rejects.toMatchObject({
      kind: 'imagesFailed',
      message: '部分图片无法读取，请检查网络或图片访问权限',
    })
    await vi.advanceTimersByTimeAsync(10)
    await rejection
    expect(aborted).toBe(true)
  })

  it('限制唯一图片数量并允许总量刚好到达边界', async () => {
    const fetchImage = vi.fn().mockImplementation(() => Promise.resolve(response([4])))
    await expect(loadImages(
      ['https://example.com/a', 'https://example.com/b'],
      fetchImage,
      limits,
    )).resolves.toHaveLength(2)
    await expect(loadImages(
      ['https://example.com/1', 'https://example.com/2', 'https://example.com/3', 'https://example.com/4'],
      fetchImage,
      limits,
    )).rejects.toThrow('图片过多')
  })

  it('限制并发并在任一图片失败时中止其他活动请求', async () => {
    let active = 0
    let maxActive = 0
    const releases: Array<() => void> = []
    const fetchImage = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      active++
      maxActive = Math.max(maxActive, active)
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          active--
          reject(new DOMException('aborted', 'AbortError'))
        })
        releases.push(() => {
          active--
          resolve(response([1]))
        })
      })
    })
    const pending = loadImages(
      ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'],
      fetchImage,
      limits,
    )
    await vi.waitFor(() => expect(fetchImage).toHaveBeenCalledTimes(2))
    releases.shift()?.()
    await vi.waitFor(() => expect(fetchImage).toHaveBeenCalledTimes(3))
    releases.pop()?.()
    releases.shift()?.()
    await pending
    expect(maxActive).toBe(2)

    let aborted = false
    const failingFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/bad'))
        return Promise.reject(new Error('secret https://example.com/bad?q=1'))
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    })
    await expect(loadImages(
      ['https://example.com/bad', 'https://example.com/pending'],
      failingFetch,
      limits,
    )).rejects.toThrow('请检查网络或图片访问权限')
    expect(aborted).toBe(true)
  })
})
