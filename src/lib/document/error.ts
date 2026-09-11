import type { DocumentWorkerErrorCode } from './protocol'
import { DOCUMENT_MAX_FILE_SIZE_MIB } from './files'

export type DocumentImportErrorCode = DocumentWorkerErrorCode | 'tooLarge'

export class DocumentImportError extends Error {
  constructor(public readonly code: DocumentImportErrorCode) {
    super(code)
    this.name = 'DocumentImportError'
  }
}

export function getDocumentImportErrorMessage(fileName: string, error: DocumentImportError): string {
  const { code } = error
  const messages: Record<DocumentImportErrorCode, string> = {
    tooLarge: `文件超过 ${DOCUMENT_MAX_FILE_SIZE_MIB} MiB`,
    unsupported: '不支持该文件或扫描版 PDF',
    malformed: '文件损坏，无法导入',
    encrypted: '文件已加密，无法导入',
    resourceLimit: '文件过于复杂，无法导入',
    missingPart: '文件内容不完整',
    needsOcr: '文件需要文字识别（OCR），请先识别文字后再导入',
    runtime: '文档转换失败，请重试',
  }
  return `${messages[code]}: ${fileName}`
}
