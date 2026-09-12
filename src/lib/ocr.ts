import type { PaddleOCR } from '@paddleocr/paddleocr-js'
import { Mutex } from 'es-toolkit'

type OcrEngine = Awaited<ReturnType<typeof PaddleOCR.create>>
type OcrModel = 'PP-OCRv6_tiny' | 'PP-OCRv6_small'

const ortWasmPaths = 'https://testingcf.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/'

let currentEngine: OcrEngine | null = null
let currentModel: OcrModel | null = null
const mutex = new Mutex()

async function getEngine(model: OcrModel): Promise<OcrEngine> {
  if (currentEngine && currentModel === model) {
    return currentEngine
  }
  if (currentEngine) {
    const engine = currentEngine
    currentEngine = null
    currentModel = null
    await engine.dispose()
  }

  const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
  const engine = await PaddleOCR.create({
    worker: true,
    textDetectionModelName: `${model}_det`,
    textRecognitionModelName: `${model}_rec`,
    ortOptions: {
      backend: 'auto',
      wasmPaths: ortWasmPaths,
      numThreads: 1,
      simd: true,
    },
  })
  currentEngine = engine
  currentModel = model
  return engine
}

export async function recognizeImageText(image: File, enhanced: boolean): Promise<string> {
  await mutex.acquire()
  try {
    const model = enhanced ? 'PP-OCRv6_small' : 'PP-OCRv6_tiny'
    const engine = await getEngine(model)
    const [result] = await engine.predict(image)
    return result.items
      .map(item => item.text.trim())
      .filter(Boolean)
      .join('\n')
  }
  finally {
    mutex.release()
  }
}
