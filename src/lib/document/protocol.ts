import type { ConvertErrorCode, Format } from '@firecrawl/anydoc-wasm'

export const DOCUMENT_ERROR_CODES = [
  'unsupported',
  'malformed',
  'encrypted',
  'resourceLimit',
  'missingPart',
  'needsOcr',
] as const satisfies readonly ConvertErrorCode[]

export type DocumentWorkerErrorCode = ConvertErrorCode | 'runtime'

export interface DocumentWorkerRequest {
  bytes: ArrayBuffer
  formatHint?: Format
}

export type DocumentWorkerResponse
  = | { success: true, markdown: string }
    | { success: false, code: DocumentWorkerErrorCode }

export function isDocumentErrorCode(code: unknown): code is ConvertErrorCode {
  return DOCUMENT_ERROR_CODES.includes(code as ConvertErrorCode)
}
