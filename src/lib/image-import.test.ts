import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareImageImport } from './image-import'

const mocks = vi.hoisted(() => ({
  recognizeImageText: vi.fn(),
  uploadImage: vi.fn(),
}))

vi.mock('./ocr', () => ({ recognizeImageText: mocks.recognizeImageText }))
vi.mock('./upload-image', () => ({ uploadImage: mocks.uploadImage }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('图片导入准备', () => {
  it('关闭 OCR 时上传并生成图片 Markdown', async () => {
    mocks.uploadImage.mockResolvedValue({ url: '/image.png' })
    const image = new File(['image'], '图.png', { type: 'image/png' })

    await expect(prepareImageImport(image, false, true)).resolves.toEqual({
      kind: 'image',
      content: '![图.png](/image.png)\n\n',
    })
    expect(mocks.recognizeImageText).not.toHaveBeenCalled()
    const formData = mocks.uploadImage.mock.calls[0]?.[0] as FormData
    expect(formData.get('file')).toBe(image)
    expect(formData.get('name')).toBe('图.png')
  })

  it.each([false, true])('开启 OCR 时只识别文字，增强=%s', async (enhanced) => {
    mocks.recognizeImageText.mockResolvedValue('识别文字')
    const image = new File(['image'], '图.png', { type: 'image/png' })

    await expect(prepareImageImport(image, true, enhanced)).resolves.toEqual({
      kind: 'text',
      content: '识别文字',
    })
    expect(mocks.recognizeImageText).toHaveBeenCalledExactlyOnceWith(image, enhanced)
    expect(mocks.uploadImage).not.toHaveBeenCalled()
  })

  it('ocr 失败时不回退上传', async () => {
    mocks.recognizeImageText.mockRejectedValue(new Error('识别失败'))
    const image = new File(['image'], '图.png', { type: 'image/png' })

    await expect(prepareImageImport(image, true, false)).rejects.toThrow('识别失败')
    expect(mocks.uploadImage).not.toHaveBeenCalled()
  })
})
