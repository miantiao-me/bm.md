export const FILES_SIGNAL_KEY = 'bm.md.files.signal'

export type FilesSignal
  = | { kind: 'catalog', revision: number, nonce: string }
    | { kind: 'content', fileId: string, version: number, nonce: string }

function isVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function parseFilesSignal(value: string | null): FilesSignal | null {
  if (!value) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || !('kind' in parsed) || !('nonce' in parsed) || typeof parsed.nonce !== 'string') {
      return null
    }
    if (parsed.kind === 'catalog' && 'revision' in parsed && isVersion(parsed.revision)) {
      return { kind: 'catalog', revision: parsed.revision, nonce: parsed.nonce }
    }
    if (parsed.kind === 'content' && 'fileId' in parsed && typeof parsed.fileId === 'string' && 'version' in parsed && isVersion(parsed.version)) {
      return { kind: 'content', fileId: parsed.fileId, version: parsed.version, nonce: parsed.nonce }
    }
  }
  catch {
    // 非法通知由接收方忽略。
  }
  return null
}

function publish(signal: FilesSignal): void {
  try {
    localStorage.setItem(FILES_SIGNAL_KEY, JSON.stringify(signal))
  }
  catch {
    // 跨标签通知失败不影响当前标签工作。
  }
}

export function publishCatalogSignal(revision: number): void {
  publish({ kind: 'catalog', revision, nonce: crypto.randomUUID() })
}

export function publishContentSignal(fileId: string, version: number): void {
  publish({ kind: 'content', fileId, version, nonce: crypto.randomUUID() })
}
