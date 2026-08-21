import type { FetchedImage } from '@takumi-rs/helpers'
import { logSafeError } from '@/lib/log-safe-error'
import {
  PDF_IMAGE_FETCH_TIMEOUT_MS,
  PDF_IMAGE_MAX_BYTES,
  PDF_IMAGE_MAX_CONCURRENCY,
  PDF_IMAGE_MAX_COUNT,
  PDF_IMAGE_TOTAL_MAX_BYTES,
  PdfError,
} from './protocol'

export function resolveImageUrl(currentSrc: string, src: string, baseUrl: string): string {
  const source = currentSrc.trim() || src.trim()
  if (!source)
    throw new PdfError('imagesFailed', '预览中存在无效图片，请检查后重试')
  try {
    return new URL(source, baseUrl).href
  }
  catch (error) {
    logSafeError('PDF 图片地址无效', error)
    throw new PdfError('imagesFailed', '预览中存在无效图片，请检查后重试', { cause: error })
  }
}

function declaredLength(response: Response): number | undefined {
  const value = response.headers.get('content-length')
  if (!value || !/^\d+$/.test(value))
    return undefined
  const length = Number(value)
  return Number.isSafeInteger(length) ? length : undefined
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  }
  catch {
    // 原始读取错误比取消失败更有诊断价值。
  }
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel()
  }
  catch {
    // 超限错误必须优先返回，取消失败仅影响资源回收。
  }
}

export async function loadImages(
  sources: string[],
  fetchImage: typeof fetch = fetch,
  limits = {
    concurrency: PDF_IMAGE_MAX_CONCURRENCY,
    count: PDF_IMAGE_MAX_COUNT,
    imageBytes: PDF_IMAGE_MAX_BYTES,
    timeoutMs: PDF_IMAGE_FETCH_TIMEOUT_MS,
    totalBytes: PDF_IMAGE_TOTAL_MAX_BYTES,
  } as {
    concurrency: number
    count: number
    imageBytes: number
    timeoutMs?: number
    totalBytes: number
  },
): Promise<FetchedImage[]> {
  const uniqueSources = [...new Set(sources)]
  if (uniqueSources.length > limits.count)
    throw new PdfError('imagesFailed', '图片过多，请减少到 64 张以内')

  const images = Array.from<FetchedImage>({ length: uniqueSources.length })
  const controllers = new Set<AbortController>()
  let nextIndex = 0
  let totalBytes = 0
  let declaredBytes = 0

  async function load(src: string): Promise<ArrayBuffer> {
    const controller = new AbortController()
    controllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), limits.timeoutMs ?? PDF_IMAGE_FETCH_TIMEOUT_MS)
    let response: Response | undefined
    try {
      response = await fetchImage(src, { signal: controller.signal })
      if (!response.ok) {
        await cancelBody(response)
        const cause = Object.assign(new Error('PDF image response failed'), { status: response.status })
        logSafeError('PDF 图片响应失败', cause)
        throw new PdfError('imagesFailed', '部分图片无法读取，请检查图片访问权限', { cause })
      }

      const length = declaredLength(response)
      if (length !== undefined) {
        if (length > limits.imageBytes) {
          await cancelBody(response)
          throw new PdfError('imagesFailed', '单张图片过大，请压缩到 20 MiB 以内')
        }
        declaredBytes += length
        if (declaredBytes > limits.totalBytes) {
          await cancelBody(response)
          throw new PdfError('imagesFailed', '图片总量过大，请减少到 64 MiB 以内')
        }
      }
      if (!response.body)
        throw new PdfError('imagesFailed', '部分图片无法读取，请检查图片访问权限')

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let bytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break
        bytes += value.byteLength
        totalBytes += value.byteLength
        if (bytes > limits.imageBytes) {
          await cancelReader(reader)
          throw new PdfError('imagesFailed', '单张图片过大，请压缩到 20 MiB 以内')
        }
        if (totalBytes > limits.totalBytes) {
          await cancelReader(reader)
          throw new PdfError('imagesFailed', '图片总量过大，请减少到 64 MiB 以内')
        }
        chunks.push(value)
      }
      if (bytes === 0)
        throw new PdfError('imagesFailed', '预览中存在空图片，请移除后重试')

      const data = new Uint8Array(bytes)
      let offset = 0
      for (const chunk of chunks) {
        data.set(chunk, offset)
        offset += chunk.byteLength
      }
      return data.buffer
    }
    catch (error) {
      if (error instanceof PdfError)
        throw error
      logSafeError('PDF 图片读取失败', error)
      throw new PdfError('imagesFailed', '部分图片无法读取，请检查网络或图片访问权限', { cause: error })
    }
    finally {
      clearTimeout(timeout)
      controllers.delete(controller)
    }
  }

  async function consume(): Promise<void> {
    while (nextIndex < uniqueSources.length) {
      const index = nextIndex++
      const src = uniqueSources[index]
      images[index] = { src, data: await load(src) }
    }
  }

  try {
    await Promise.all(Array.from(
      { length: Math.min(uniqueSources.length, limits.concurrency) },
      () => consume(),
    ))
    return images
  }
  catch (error) {
    for (const controller of controllers)
      controller.abort()
    throw error
  }
}
