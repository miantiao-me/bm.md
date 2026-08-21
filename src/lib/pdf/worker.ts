/// <reference lib="webworker" />

import type { PdfRenderInput, PdfWorkerResponse } from './protocol'
import { googleFonts } from '@takumi-rs/helpers'
import initTakumi, { PdfRenderer } from 'takumi-pdf/no-init'
import wasmUrl from 'takumi-pdf/wasm-url'
import { logSafeError } from '@/lib/log-safe-error'
import { GOOGLE_FONTS_CSS_BASE_URL } from '../google-fonts'
import {
  createCachedFontFetch,
  FontUnavailableError,
  googleFontFamily,
  isFontUnavailable,
  missingGlyphs,
} from './fonts'
import { PDF_PAGE_MARGIN } from './protocol'

const fontCacheStorage = {
  async open(name: string) {
    const cache = await caches.open(name)
    return {
      match: (request: string) => cache.match(request),
      put: (request: string, response: Response) => cache.put(request, response),
    }
  },
}
const cachedFontFetch = createCachedFontFetch(fontCacheStorage, (input, init) => fetch(input, init))

class RuntimeUnavailableError extends Error {}

async function loadFonts(families: string[]) {
  try {
    const fonts = await googleFonts({
      baseUrl: GOOGLE_FONTS_CSS_BASE_URL,
      display: 'swap',
      families: families.map(googleFontFamily),
      fetch: cachedFontFetch,
      maxBytes: 32 * 1024 * 1024,
      timeout: 15_000,
    })
    return fonts.map(font => ({
      ...font,
      async data() {
        try {
          return await font.data()
        }
        catch (error) {
          throw new FontUnavailableError('字体服务不可用', { cause: error })
        }
      },
    }))
  }
  catch (error) {
    throw new FontUnavailableError('字体服务不可用', { cause: error })
  }
}

let rendererPromise: Promise<PdfRenderer> | undefined

async function renderer(): Promise<PdfRenderer> {
  try {
    rendererPromise ??= initTakumi({ module_or_path: wasmUrl }).then(() => new PdfRenderer())
    return await rendererPromise
  }
  catch (error) {
    throw new RuntimeUnavailableError('PDF 引擎初始化失败', { cause: error })
  }
}

function exactBuffer(pdf: Uint8Array): ArrayBuffer {
  if (pdf.buffer instanceof ArrayBuffer && pdf.byteOffset === 0 && pdf.byteLength === pdf.buffer.byteLength)
    return pdf.buffer
  return pdf.slice().buffer as ArrayBuffer
}

globalThis.addEventListener('message', async (event: MessageEvent<PdfRenderInput>) => {
  try {
    const request = event.data
    const pdf = await (await renderer()).render(request.html, {
      backgroundColor: request.backgroundColor,
      fontFamilies: request.fontFamilies,
      fonts: await loadFonts(request.fontFamilies),
      images: request.images,
      lang: request.lang,
      landscape: false,
      margin: PDF_PAGE_MARGIN,
      metadata: { creator: 'bm.md', title: request.title },
      outline: true,
      size: 'a4',
      stylesheets: request.stylesheets,
    })
    const buffer = exactBuffer(pdf)
    const response: PdfWorkerResponse = { success: true, pdf: buffer }
    globalThis.postMessage(response, { transfer: [buffer] })
  }
  catch (error) {
    logSafeError('PDF Worker 渲染失败', error)
    const codepoints = missingGlyphs(error)
    if (codepoints.length > 0) {
      const response: PdfWorkerResponse = {
        success: false,
        kind: 'missingGlyphs',
        codepoints,
        images: event.data.images,
      }
      globalThis.postMessage(response, { transfer: event.data.images.map(image => image.data) })
      return
    }
    const response: PdfWorkerResponse = {
      success: false,
      kind: error instanceof RuntimeUnavailableError
        ? 'runtimeUnavailable'
        : isFontUnavailable(error) ? 'fontUnavailable' : 'renderFailed',
    }
    globalThis.postMessage(response)
  }
})
