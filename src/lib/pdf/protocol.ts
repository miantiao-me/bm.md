import type { FetchedImage } from '@takumi-rs/helpers'

export const PDF_PAGE_MARGIN = { top: 45, right: 30, bottom: 45, left: 30 } as const
export const PDF_WORKER_TIMEOUT_MS = 60_000
export const PDF_IMAGE_FETCH_TIMEOUT_MS = 30_000
export const PDF_IMAGE_MAX_BYTES = 20 * 1024 * 1024
export const PDF_IMAGE_TOTAL_MAX_BYTES = 64 * 1024 * 1024
export const PDF_IMAGE_MAX_COUNT = 64
export const PDF_IMAGE_MAX_CONCURRENCY = 4

export interface GlyphReplacement {
  codepoints: number[]
  original: string
}

export interface PdfRenderInput {
  backgroundColor: string
  fontFamilies: string[]
  html: string
  images: FetchedImage[]
  lang: string
  stylesheets: string[]
  title: string
}

export type PdfWorkerResponse
  = | { success: true, pdf: ArrayBuffer }
    | { success: false, kind: 'missingGlyphs', codepoints: number[], images: FetchedImage[] }
    | { success: false, kind: 'fontUnavailable' | 'renderFailed' | 'runtimeUnavailable' }

export type PdfErrorKind
  = | 'fontUnavailable'
    | 'imagesFailed'
    | 'renderFailed'
    | 'runtimeUnavailable'
    | 'snapshotFailed'

export class PdfError extends Error {
  constructor(readonly kind: PdfErrorKind, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PdfError'
  }
}
