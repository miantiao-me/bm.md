import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  toMarkdownBytes: vi.fn(),
}))

vi.mock('@firecrawl/anydoc-wasm', () => ({
  default: mocks.init,
  toMarkdownBytes: mocks.toMarkdownBytes,
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => vi.resetModules())

describe('anyDoc 转换', () => {
  it('初始化失败后允许重试', async () => {
    mocks.init.mockRejectedValueOnce(new Error('失败')).mockResolvedValueOnce(undefined)
    mocks.toMarkdownBytes.mockReturnValue('成功')
    const { convertWithAnyDoc } = await import('./anydoc')
    const input = { bytes: new ArrayBuffer(0) }

    await expect(convertWithAnyDoc(input)).resolves.toEqual({ success: false, code: 'runtime' })
    await expect(convertWithAnyDoc(input)).resolves.toEqual({ success: true, markdown: '成功' })
    expect(mocks.init).toHaveBeenCalledTimes(2)
  })

  it('将 CSV hint 传给转换器并保留完整字节', async () => {
    mocks.toMarkdownBytes.mockReturnValue('| 值 |')
    const { convertWithAnyDoc } = await import('./anydoc')
    const bytes = new Uint8Array([1, 2]).buffer

    await convertWithAnyDoc({ bytes, formatHint: 'csv' })
    expect(mocks.toMarkdownBytes).toHaveBeenCalledWith(new Uint8Array([1, 2]), 'csv')
  })

  it('初始化错误即使携带已知 code 也映射为 runtime', async () => {
    mocks.init.mockRejectedValueOnce(Object.assign(new Error('初始化失败'), { code: 'malformed' }))
    const { convertWithAnyDoc } = await import('./anydoc')

    await expect(convertWithAnyDoc({ bytes: new ArrayBuffer(0) })).resolves.toEqual({
      success: false,
      code: 'runtime',
    })
    expect(mocks.toMarkdownBytes).not.toHaveBeenCalled()
  })

  it.each([
    ['encrypted', 'encrypted'],
    ['needsOcr', 'needsOcr'],
    ['unknown', 'runtime'],
  ] as const)('将 %s 错误映射为 %s', async (sourceCode, expectedCode) => {
    mocks.toMarkdownBytes.mockImplementation(() => {
      throw Object.assign(new Error('转换失败'), { code: sourceCode })
    })
    const { convertWithAnyDoc } = await import('./anydoc')

    await expect(convertWithAnyDoc({ bytes: new ArrayBuffer(0) })).resolves.toEqual({
      success: false,
      code: expectedCode,
    })
  })
})
