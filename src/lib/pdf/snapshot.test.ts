// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPdfSnapshot, detectPdfTypography } from './snapshot'

const mocks = vi.hoisted(() => ({
  loadImages: vi.fn(),
  replaceKatexWithImages: vi.fn(),
  replaceSvgWithImages: vi.fn(),
}))

vi.mock('./images', () => ({
  loadImages: mocks.loadImages,
  resolveImageUrl: (currentSrc: string, src: string, baseUrl: string) => new URL(currentSrc || src, baseUrl).href,
}))
vi.mock('./katex-images', () => ({ replaceKatexWithImages: mocks.replaceKatexWithImages }))
vi.mock('./svg-images', () => ({ replaceSvgWithImages: mocks.replaceSvgWithImages }))

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
  mocks.loadImages.mockReset().mockResolvedValue([
    { src: 'https://example.com/normal.png', data: new ArrayBuffer(1) },
    { src: 'blob:formula', data: new ArrayBuffer(1) },
  ])
  mocks.replaceKatexWithImages.mockReset().mockImplementation((_source: Element, clone: Element) => {
    const formula = clone.querySelector('[data-bm-rich="katex"]')
    const image = clone.ownerDocument.createElement('img')
    image.className = 'bm-pdf-katex-inline'
    image.src = 'blob:formula'
    formula?.replaceWith(image)
    return Promise.resolve(['blob:formula'])
  })
  mocks.replaceSvgWithImages.mockReset().mockResolvedValue([])
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

describe('pdf 快照字体特征', () => {
  it('分别读取正文与首个标题的 computed font-family', () => {
    const heading = {}
    const getComputedStyle = vi.fn((element: unknown) => ({
      fontFamily: element === heading ? 'Georgia, serif' : 'Arial, sans-serif',
    }))
    const content = {
      ownerDocument: { defaultView: { getComputedStyle } },
      querySelector: vi.fn().mockReturnValue(heading),
    } as unknown as HTMLElement

    expect(detectPdfTypography(content)).toEqual({ bodySerif: false, headingSerif: true })
    expect(getComputedStyle).toHaveBeenCalledTimes(2)
  })

  it('普通图片与公式图片一次加载，且替换前保留标题并在完成后撤销 URL', async () => {
    document.documentElement.lang = 'zh-CN'
    const content = document.createElement('div')
    content.id = 'bm-md'
    content.innerHTML = '<h1>保留标题</h1><img src="https://example.com/normal.png"><span data-bm-rich="katex" data-bm-hash="x">x</span>'
    document.body.append(content)

    const result = await createPdfSnapshot(content)
    expect(mocks.loadImages).toHaveBeenCalledOnce()
    expect(mocks.loadImages).toHaveBeenCalledWith(['https://example.com/normal.png', 'blob:formula'])
    expect(result.title).toBe('保留标题')
    expect(result.images).toHaveLength(2)
    expect(result.html).toContain('<h1>保留标题</h1>')
    expect(result.html).toContain('<img src="https://example.com/normal.png">')
    expect(result.html).toContain('<img class="bm-pdf-katex-inline" src="blob:formula">')
    expect(result.html.indexOf('<h1>')).toBeLessThan(result.html.indexOf('https://example.com/normal.png'))
    expect(result.html.indexOf('https://example.com/normal.png')).toBeLessThan(result.html.indexOf('bm-pdf-katex-inline'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:formula')
  })

  it('将图表生成的 PNG 交给图片加载并在完成后撤销 URL', async () => {
    const content = document.createElement('div')
    content.innerHTML = '<figure class="figure-mermaid"><svg><text>流程</text></svg><figcaption>说明</figcaption></figure>'
    document.body.append(content)
    mocks.replaceSvgWithImages.mockImplementation((_source: Element, clone: Element) => {
      const svg = clone.querySelector('svg')!
      const image = clone.ownerDocument.createElement('img')
      image.src = 'blob:diagram'
      svg.replaceWith(image)
      return Promise.resolve(['blob:diagram'])
    })
    mocks.loadImages.mockResolvedValue([{ src: 'blob:diagram', data: new ArrayBuffer(1) }])

    const result = await createPdfSnapshot(content)

    expect(mocks.loadImages).toHaveBeenCalledWith(['blob:diagram'])
    expect(result.html).toContain('<img src="blob:diagram">')
    expect(result.html).toContain('<figcaption>说明</figcaption>')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:diagram')
  })

  it('先替换 SVG 内的 KaTeX，再执行 SVG 图片化', async () => {
    const calls: string[] = []
    const content = document.createElement('div')
    content.innerHTML = '<svg><foreignObject><span data-bm-rich="katex" data-bm-hash="x">x</span></foreignObject></svg>'
    document.body.append(content)
    mocks.replaceKatexWithImages.mockImplementation((_source: Element, clone: Element) => {
      calls.push('katex')
      clone.querySelector('[data-bm-rich="katex"]')?.replaceWith(clone.ownerDocument.createElement('img'))
      return Promise.resolve([])
    })
    mocks.replaceSvgWithImages.mockImplementation(() => {
      calls.push('svg')
      return Promise.resolve([])
    })
    mocks.loadImages.mockResolvedValue([])

    await createPdfSnapshot(content)

    expect(calls).toEqual(['katex', 'svg'])
  })

  it('冻结 picture 的 currentSrc 并移除响应式来源', async () => {
    const content = document.createElement('div')
    content.innerHTML = '<picture><source srcset="wide.svg" media="(min-width: 800px)"><img src="fallback.svg" srcset="small.svg 1x" sizes="50vw" loading="lazy"></picture>'
    document.body.append(content)
    Object.defineProperty(content.querySelector('img'), 'currentSrc', {
      configurable: true,
      value: 'https://example.com/selected.SVG?version=1',
    })
    mocks.loadImages.mockResolvedValue([{ src: 'https://example.com/selected.SVG?version=1', data: new ArrayBuffer(1) }])

    const result = await createPdfSnapshot(content)

    expect(result.html).toContain('src="https://example.com/selected.SVG?version=1"')
    expect(result.html).not.toContain('<source')
    expect(result.html).not.toContain('srcset=')
    expect(result.html).not.toContain('sizes=')
    expect(result.html).not.toContain('loading=')
  })

  it('等待 loadImages 完成后才回收 Blob URL', async () => {
    let resolveLoad!: (value: Array<{ src: string, data: ArrayBuffer }>) => void
    const pending = new Promise<Array<{ src: string, data: ArrayBuffer }>>(resolve => resolveLoad = resolve)
    const content = document.createElement('div')
    content.innerHTML = '<svg><text>图表</text></svg>'
    document.body.append(content)
    mocks.replaceSvgWithImages.mockImplementation((_source: Element, clone: Element) => {
      const image = clone.ownerDocument.createElement('img')
      image.src = 'blob:pending'
      clone.querySelector('svg')?.replaceWith(image)
      return Promise.resolve(['blob:pending'])
    })
    mocks.loadImages.mockReturnValue(pending)

    const snapshot = createPdfSnapshot(content)
    await vi.waitFor(() => expect(mocks.loadImages).toHaveBeenCalled())
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:pending')
    resolveLoad([{ src: 'blob:pending', data: new ArrayBuffer(1) }])
    await snapshot
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pending')
  })

  it('loadImages 失败后仍回收 Blob URL', async () => {
    let rejectLoad!: (reason: Error) => void
    const content = document.createElement('div')
    content.innerHTML = '<svg><text>图表</text></svg>'
    document.body.append(content)
    mocks.replaceSvgWithImages.mockResolvedValue(['blob:failed'])
    mocks.loadImages.mockReturnValue(new Promise((_resolve, reject) => rejectLoad = reject))

    const snapshot = createPdfSnapshot(content)
    await vi.waitFor(() => expect(mocks.loadImages).toHaveBeenCalled())
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:failed')
    rejectLoad(new Error('load failed'))
    await expect(snapshot).rejects.toThrow('load failed')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:failed')
  })
})
