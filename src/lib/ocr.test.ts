import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('@paddleocr/paddleocr-js', () => ({
  PaddleOCR: { create: mocks.create },
}))

function createEngine(texts: string[] = []) {
  return {
    dispose: vi.fn().mockResolvedValue(undefined),
    predict: vi.fn().mockResolvedValue([{
      items: texts.map(text => ({ text })),
    }]),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('图片 OCR', () => {
  it.each([
    [false, 'PP-OCRv6_tiny'],
    [true, 'PP-OCRv6_small'],
  ])('按增强设置选择模型，增强=%s', async (enhanced, model) => {
    const engine = createEngine(['第一行', ' 第二行 ', ''])
    mocks.create.mockResolvedValue(engine)
    const { recognizeImageText } = await import('./ocr')
    const image = new File(['image'], 'image.png', { type: 'image/png' })

    await expect(recognizeImageText(image, enhanced)).resolves.toBe('第一行\n第二行')
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
      worker: true,
      textDetectionModelName: `${model}_det`,
      textRecognitionModelName: `${model}_rec`,
      ortOptions: {
        backend: 'auto',
        wasmPaths: 'https://testingcf.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/',
        numThreads: 1,
        simd: true,
      },
    })
    expect(engine.predict).toHaveBeenCalledExactlyOnceWith(image)
  })

  it('复用同一模型并串行执行识别', async () => {
    let finishFirst!: () => void
    const first = new Promise((resolve) => {
      finishFirst = () => resolve([{ items: [{ text: '一' }] }])
    })
    const engine = createEngine()
    engine.predict
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce([{ items: [{ text: '二' }] }])
    mocks.create.mockResolvedValue(engine)
    const { recognizeImageText } = await import('./ocr')

    const one = recognizeImageText(new File(['1'], '1.png'), false)
    const two = recognizeImageText(new File(['2'], '2.png'), false)
    await vi.waitFor(() => expect(engine.predict).toHaveBeenCalledOnce())
    finishFirst()

    await expect(Promise.all([one, two])).resolves.toEqual(['一', '二'])
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(engine.predict).toHaveBeenCalledTimes(2)
  })

  it('切换模型时释放旧引擎', async () => {
    const tiny = createEngine(['轻量'])
    const small = createEngine(['增强'])
    mocks.create.mockResolvedValueOnce(tiny).mockResolvedValueOnce(small)
    const { recognizeImageText } = await import('./ocr')
    const image = new File(['image'], 'image.png')

    await expect(recognizeImageText(image, false)).resolves.toBe('轻量')
    await expect(recognizeImageText(image, true)).resolves.toBe('增强')

    expect(tiny.dispose).toHaveBeenCalledOnce()
    expect(small.dispose).not.toHaveBeenCalled()
  })

  it('初始化失败后允许重试', async () => {
    const engine = createEngine(['成功'])
    mocks.create.mockRejectedValueOnce(new Error('初始化失败')).mockResolvedValueOnce(engine)
    const { recognizeImageText } = await import('./ocr')
    const image = new File(['image'], 'image.png')

    await expect(recognizeImageText(image, false)).rejects.toThrow('初始化失败')
    await expect(recognizeImageText(image, false)).resolves.toBe('成功')
    expect(mocks.create).toHaveBeenCalledTimes(2)
  })

  it('识别失败后继续执行下一任务', async () => {
    const engine = createEngine()
    engine.predict
      .mockRejectedValueOnce(new Error('识别失败'))
      .mockResolvedValueOnce([{ items: [{ text: '成功' }] }])
    mocks.create.mockResolvedValue(engine)
    const { recognizeImageText } = await import('./ocr')
    const failed = recognizeImageText(new File(['1'], '1.png'), false)
    const succeeded = recognizeImageText(new File(['2'], '2.png'), false)

    await expect(failed).rejects.toThrow('识别失败')
    await expect(succeeded).resolves.toBe('成功')
    expect(engine.predict).toHaveBeenCalledTimes(2)
  })

  it('释放旧引擎失败后允许重建', async () => {
    const tiny = createEngine(['轻量'])
    const small = createEngine(['增强'])
    tiny.dispose.mockRejectedValueOnce(new Error('释放失败'))
    mocks.create.mockResolvedValueOnce(tiny).mockResolvedValueOnce(small)
    const { recognizeImageText } = await import('./ocr')
    const image = new File(['image'], 'image.png')

    await expect(recognizeImageText(image, false)).resolves.toBe('轻量')
    await expect(recognizeImageText(image, true)).rejects.toThrow('释放失败')
    await expect(recognizeImageText(image, true)).resolves.toBe('增强')
    expect(mocks.create).toHaveBeenCalledTimes(2)
  })
})
