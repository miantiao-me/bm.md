import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportPdf } from '../actions/export-pdf'
import { PdfError } from './protocol'

const mocks = vi.hoisted(() => ({
  createPdfSnapshot: vi.fn(),
  getPreviewIframe: vi.fn(),
  logSafeError: vi.fn(),
  print: vi.fn(),
  renderPdf: vi.fn(),
  saveAs: vi.fn(),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('file-saver', () => ({ default: { saveAs: mocks.saveAs } }))
vi.mock('@/lib/log-safe-error', () => ({ logSafeError: mocks.logSafeError }))
vi.mock('../actions/preview', () => ({ getPreviewIframe: mocks.getPreviewIframe }))
vi.mock('./snapshot', () => ({ createPdfSnapshot: mocks.createPdfSnapshot }))
vi.mock('./browser', () => ({
  pdfErrorMessage: (kind: string) => kind === 'fontUnavailable'
    ? '字体暂不可用，已为你打开打印功能'
    : 'PDF 引擎不可用，已为你打开打印功能',
  renderPdf: mocks.renderPdf,
  shouldPrintFallback: (error: unknown) => error instanceof PdfError
    && (error.kind === 'fontUnavailable' || error.kind === 'runtimeUnavailable'),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createPdfSnapshot.mockResolvedValue({})
  mocks.getPreviewIframe.mockReturnValue({
    content: { textContent: '正文', querySelector: vi.fn() },
    iframe: { contentWindow: { print: mocks.print } },
  })
})

describe('pdf action 错误边界', () => {
  it.each(['fontUnavailable', 'runtimeUnavailable'] as const)('%s 时使用安全文案并打开打印', async (kind) => {
    mocks.renderPdf.mockRejectedValue(new PdfError(kind, 'secret https://example.com/?token=1'))
    await exportPdf()

    expect(mocks.print).toHaveBeenCalledOnce()
    expect(mocks.toast.warning).toHaveBeenCalledOnce()
    expect(JSON.stringify(mocks.toast.warning.mock.calls)).not.toContain('https://')
    expect(JSON.stringify(mocks.toast.warning.mock.calls)).not.toContain('secret')
  })

  it('图片错误不向用户展示 URL、data URL 或底层错误', async () => {
    mocks.renderPdf.mockRejectedValue(new PdfError(
      'imagesFailed',
      '部分图片无法读取，请检查网络或图片访问权限',
      { cause: new Error('Takumi data:image/png;base64,secret?token=1') },
    ))
    await exportPdf()

    const calls = JSON.stringify(mocks.toast.error.mock.calls)
    expect(calls).toContain('部分图片无法读取')
    expect(calls).not.toContain('data:image')
    expect(calls).not.toContain('Takumi')
    expect(calls).not.toContain('token=1')
    expect(mocks.print).not.toHaveBeenCalled()
  })
})

describe('pdf action 成功路径', () => {
  it('把 ArrayBuffer 写入 PDF Blob，无替换时提示成功', async () => {
    const pdf = new Uint8Array([1, 2, 3]).buffer
    mocks.renderPdf.mockResolvedValue({ pdf, replacements: [] })
    await exportPdf()

    expect(mocks.saveAs).toHaveBeenCalledOnce()
    const [blob, filename] = mocks.saveAs.mock.calls[0] as [Blob, string]
    expect(filename).toBe('bm.md.pdf')
    expect(blob.type).toBe('application/pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array(pdf))
    expect(mocks.toast.success).toHaveBeenCalledWith('已导出 PDF', { id: 'toast-id' })
    expect(mocks.toast.warning).not.toHaveBeenCalled()
  })

  it('有字符替换时保存 PDF 并提示 warning', async () => {
    mocks.renderPdf.mockResolvedValue({
      pdf: new ArrayBuffer(1),
      replacements: [{ original: '✅', codepoints: [0x2705] }],
    })
    await exportPdf()

    expect(mocks.saveAs).toHaveBeenCalledOnce()
    expect(mocks.toast.warning).toHaveBeenCalledWith(
      'PDF 已导出，部分不支持字符已替换为 □',
      expect.objectContaining({ id: 'toast-id', description: expect.stringContaining('✅') }),
    )
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })
})
