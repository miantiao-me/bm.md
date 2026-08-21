import type { GlyphReplacement, PdfRenderInput, PdfWorkerResponse } from './protocol'
import { logSafeError } from '@/lib/log-safe-error'
import { recoverMissingGlyphs } from './fonts'
import { PDF_WORKER_TIMEOUT_MS, PdfError } from './protocol'

interface PdfWorker {
  addEventListener: Worker['addEventListener']
  postMessage: Worker['postMessage']
  removeEventListener: Worker['removeEventListener']
  terminate: Worker['terminate']
}

type Recover = typeof recoverMissingGlyphs
type WorkerFactory = () => PdfWorker

export interface PdfRenderResult {
  pdf: ArrayBuffer
  replacements: GlyphReplacement[]
}

export class PdfBrowser {
  private worker?: PdfWorker

  constructor(
    private readonly createWorker: WorkerFactory = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    private readonly recover: Recover = recoverMissingGlyphs,
    private readonly timeoutMs = PDF_WORKER_TIMEOUT_MS,
  ) {}

  private getWorker(): PdfWorker {
    try {
      return this.worker ??= this.createWorker()
    }
    catch (error) {
      logSafeError('PDF Worker 创建失败', error)
      throw new PdfError('runtimeUnavailable', 'PDF 引擎不可用，请使用打印功能', { cause: error })
    }
  }

  private reset(worker: PdfWorker): void {
    worker.terminate()
    if (this.worker === worker)
      this.worker = undefined
  }

  private send(input: PdfRenderInput): Promise<PdfWorkerResponse> {
    const worker = this.getWorker()
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout>
      function cleanup() {
        clearTimeout(timeout)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        worker.removeEventListener('messageerror', onMessageError)
      }
      const reset = () => this.reset(worker)
      function fail(context: string, error?: unknown) {
        cleanup()
        reset()
        logSafeError(context, error)
        reject(new PdfError('runtimeUnavailable', 'PDF 引擎不可用，请使用打印功能', { cause: error }))
      }
      function onMessage(event: MessageEvent<PdfWorkerResponse>) {
        const response = event.data
        if (!response || typeof response !== 'object' || typeof response.success !== 'boolean') {
          fail('PDF Worker 返回无效响应')
          return
        }
        cleanup()
        resolve(response)
      }
      function onError(event: ErrorEvent) {
        fail('PDF Worker 运行失败', event.error)
      }
      function onMessageError(event: MessageEvent) {
        fail('PDF Worker 响应无法解析', event.data)
      }

      timeout = setTimeout(fail, this.timeoutMs, 'PDF Worker 响应超时')
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      worker.addEventListener('messageerror', onMessageError)
      try {
        worker.postMessage(input, input.images.map(image => image.data))
      }
      catch (error) {
        fail('PDF Worker 请求发送失败', error)
      }
    })
  }

  async render(input: PdfRenderInput): Promise<PdfRenderResult> {
    const replacements: GlyphReplacement[] = []
    const probed = new Set<number>()
    for (let attempt = 0; attempt <= 3; attempt++) {
      const response = await this.send(input)
      if (response.success)
        return { pdf: response.pdf, replacements }
      if (response.kind !== 'missingGlyphs') {
        if (response.kind === 'runtimeUnavailable')
          this.reset(this.getWorker())
        const kind = response.kind === 'fontUnavailable' ? 'fontUnavailable' : response.kind === 'runtimeUnavailable' ? 'runtimeUnavailable' : 'renderFailed'
        throw new PdfError(kind, pdfErrorMessage(kind))
      }
      if (attempt === 3)
        throw new PdfError('renderFailed', '部分字符无法生成 PDF，请使用打印功能')

      input.images = response.images
      const recovery = this.recover(input, response.codepoints, probed)
      input = recovery.input
      replacements.push(...recovery.replacements)
      recovery.probed.forEach(codepoint => probed.add(codepoint))
    }
    throw new PdfError('renderFailed', 'PDF 生成失败，请重试')
  }
}

export function pdfErrorMessage(kind: PdfError['kind']): string {
  switch (kind) {
    case 'fontUnavailable':
      return '字体暂不可用，已为你打开打印功能'
    case 'runtimeUnavailable':
      return 'PDF 引擎不可用，已为你打开打印功能'
    case 'imagesFailed':
      return '图片读取失败，请检查图片后重试'
    case 'snapshotFailed':
      return '预览读取失败，请刷新后重试'
    default:
      return 'PDF 生成失败，请重试或使用打印功能'
  }
}

export function shouldPrintFallback(error: unknown): error is PdfError {
  return error instanceof PdfError
    && (error.kind === 'fontUnavailable' || error.kind === 'runtimeUnavailable')
}

const pdfBrowser = new PdfBrowser()

export function renderPdf(input: PdfRenderInput): Promise<PdfRenderResult> {
  return pdfBrowser.render(input)
}
