import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveBlob } from './download'

let anchor: { click: ReturnType<typeof vi.fn>, remove: ReturnType<typeof vi.fn>, href: string, download: string }
let appended: unknown[]
let createObjectURL: ReturnType<typeof vi.fn>
let revokeObjectURL: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  appended = []
  anchor = { click: vi.fn(), remove: vi.fn(), href: '', download: '' }
  createObjectURL = vi.fn(() => 'blob:mock')
  revokeObjectURL = vi.fn()
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchor),
    body: { append: vi.fn((node: unknown) => appended.push(node)) },
  })
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('saveBlob', () => {
  it('用 Object URL 触发 a[download]，并在下载完成后释放', () => {
    const blob = new Blob(['# 标题'], { type: 'text/markdown;charset=utf-8' })
    saveBlob(blob, 'bm.md')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchor.href).toBe('blob:mock')
    expect(anchor.download).toBe('bm.md')
    expect(appended).toEqual([anchor])
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(anchor.remove).toHaveBeenCalledOnce()

    // 立即 revoke 会让部分浏览器取消下载。
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(40_000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
