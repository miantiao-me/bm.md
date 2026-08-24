// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { replaceSvgWithImages } from './svg-images'

const mocks = vi.hoisted(() => ({ snapdom: vi.fn() }))

vi.mock('@zumer/snapdom', () => ({ snapdom: mocks.snapdom }))

function roots(html: string) {
  const source = document.createElement('div')
  source.innerHTML = html
  document.body.append(source)
  return { clone: source.cloneNode(true) as HTMLElement, source }
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
  mocks.snapdom.mockReset().mockResolvedValue({
    toBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
  })
  vi.spyOn(URL, 'createObjectURL')
    .mockImplementationOnce(() => 'blob:svg-1')
    .mockImplementationOnce(() => 'blob:svg-2')
    .mockImplementationOnce(() => 'blob:svg-3')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 60,
    height: 40,
    left: 0,
    right: 100,
    top: 20,
    width: 100,
    x: 0,
    y: 20,
    toJSON: vi.fn(),
  })
})

describe('pdf SVG 图片化', () => {
  it('转换 Mermaid 与 Infographic 的 SVG，保留 figure 和 caption', async () => {
    const { clone, source } = roots(`
      <figure class="figure-mermaid"><svg><path d="M0 0"></path></svg><figcaption>流程图</figcaption></figure>
      <figure class="figure-infographic"><svg><rect width="10" height="10"></rect></svg><figcaption>信息图</figcaption></figure>
    `)

    await expect(replaceSvgWithImages(source, clone)).resolves.toEqual(['blob:svg-1', 'blob:svg-2'])

    expect(mocks.snapdom).toHaveBeenCalledTimes(2)
    expect(mocks.snapdom).toHaveBeenNthCalledWith(1, source.querySelector('.figure-mermaid > svg'), { dpr: 2, embedFonts: true })
    expect(clone.querySelectorAll('figure > img')).toHaveLength(2)
    expect(clone.querySelectorAll('figcaption')).toHaveLength(2)
    expect(clone.querySelectorAll('img.bm-pdf-svg-diagram')).toHaveLength(2)
  })

  it('转换含 text 的复杂 SVG，但保留仅含基础 shape 的 SVG', async () => {
    const { clone, source } = roots(`
      <svg aria-label="带文字"><path d="M0 0"></path><text>文字</text></svg>
      <svg><path d="M0 0"></path><circle cx="1" cy="1" r="1"></circle></svg>
    `)

    await replaceSvgWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledOnce()
    expect(clone.querySelector('img')?.alt).toBe('带文字')
    expect(clone.querySelectorAll('svg')).toHaveLength(1)
    expect(clone.querySelector('img')?.getAttribute('style')).toContain('width:100px')
    expect(clone.querySelector('img')?.getAttribute('style')).toContain('height:auto')
  })

  it.each([
    'https://example.com/chart.SVG?version=1',
    'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E',
  ])('转换 SVG img：%s', async (src) => {
    const { clone, source } = roots(`<img src="${src}">`)

    await replaceSvgWithImages(source, clone)

    const image = clone.querySelector('img')!
    expect(image.src).toBe('blob:svg-1')
    expect(image.style.width).toBe('100px')
    expect(image.style.height).toBe('auto')
  })

  it('通过离屏 wrapper 的冻结后代捕获 SVG img，并在完成后清理 wrapper', async () => {
    const { clone, source } = roots('<img class="theme-image" src="fallback.svg" srcset="selected.svg 2x" sizes="50vw" loading="lazy">')
    const sourceImage = source.querySelector('img')!
    Object.defineProperty(sourceImage, 'currentSrc', { configurable: true, value: 'https://example.com/selected.svg' })
    clone.querySelector('img')!.src = 'https://example.com/selected.svg'
    const decode = vi.fn().mockResolvedValue(undefined)
    const originalDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = decode

    try {
      await replaceSvgWithImages(source, clone)
    }
    finally {
      HTMLImageElement.prototype.decode = originalDecode
    }

    const wrapper = mocks.snapdom.mock.calls[0][0] as HTMLDivElement
    const frozen = wrapper.querySelector('img')!
    expect(wrapper).not.toBe(sourceImage)
    expect(frozen.src).toBe('https://example.com/selected.svg')
    expect(frozen.hasAttribute('srcset')).toBe(false)
    expect(frozen.hasAttribute('sizes')).toBe(false)
    expect(frozen.hasAttribute('loading')).toBe(false)
    expect(frozen.className).toBe('')
    expect(frozen.style.padding).toBe('0px')
    expect(frozen.style.margin).toBe('0px')
    expect(decode).toHaveBeenCalledOnce()
    expect(wrapper.isConnected).toBe(false)
    expect(clone.querySelector('img')?.className).toBe('theme-image')
  })

  it('border-box SVG img 按内容盒捕获并保留原外框布局宽度', async () => {
    const { clone, source } = roots('<img src="chart.svg" style="box-sizing:border-box;padding:10px;border:2px solid black">')

    await replaceSvgWithImages(source, clone)

    const wrapper = mocks.snapdom.mock.calls[0][0] as HTMLDivElement
    expect(wrapper.style.width).toBe('76px')
    expect(wrapper.querySelector('img')?.style.width).toBe('76px')
    expect(clone.querySelector('img')?.style.width).toBe('100px')
    expect(clone.querySelector('img')?.style.height).toBe('auto')
  })

  it('超大图使用低于 2 的同一安全 dpr', async () => {
    const { clone, source } = roots('<svg><text>大图</text></svg>')
    source.querySelector('svg')!.getBoundingClientRect = vi.fn().mockReturnValue({
      bottom: 10_000,
      height: 10_000,
      left: 0,
      right: 10_000,
      top: 0,
      width: 10_000,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    })

    await replaceSvgWithImages(source, clone)

    const dpr = mocks.snapdom.mock.calls[0][1].dpr as number
    expect(dpr).toBeLessThan(2)
    const snapshot = await mocks.snapdom.mock.results[0].value
    expect(snapshot.toBlob).toHaveBeenCalledWith({ dpr, type: 'png' })
  })

  it('单项捕获失败时保留该 SVG，并继续转换后续项', async () => {
    const { clone, source } = roots('<svg><text>失败</text></svg><svg><text>成功</text></svg>')
    mocks.snapdom
      .mockRejectedValueOnce(new Error('capture failed'))
      .mockResolvedValueOnce({ toBlob: vi.fn().mockResolvedValue(new Blob(['png'])) })

    await expect(replaceSvgWithImages(source, clone)).resolves.toEqual(['blob:svg-1'])

    expect(clone.querySelectorAll('svg')).toHaveLength(1)
    expect(clone.querySelectorAll('img')).toHaveLength(1)
  })

  it('png 超过单图预算时保留原 SVG 且不创建 URL', async () => {
    const { clone, source } = roots('<svg><text>超大 PNG</text></svg>')
    mocks.snapdom.mockResolvedValue({
      toBlob: vi.fn().mockResolvedValue({ size: 20 * 1024 * 1024 + 1 }),
    })

    await expect(replaceSvgWithImages(source, clone)).resolves.toEqual([])

    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(clone.querySelector('svg')).not.toBeNull()
    expect(clone.querySelector('img')).toBeNull()
  })

  it('nested SVG 只捕获最外层一次', async () => {
    const { clone, source } = roots('<svg><svg><text>嵌套</text></svg></svg>')

    await replaceSvgWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledOnce()
    expect(mocks.snapdom).toHaveBeenCalledWith(source.querySelector('svg'), { dpr: 2, embedFonts: true })
    expect(clone.querySelectorAll('img')).toHaveLength(1)
  })

  it.each(['filter', 'mask', 'clip-path'])('识别根 SVG 的 %s 属性', async (attribute) => {
    const { clone, source } = roots(`<svg ${attribute}="url(#effect)"><path d="M0 0"></path></svg>`)

    await replaceSvgWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledOnce()
  })

  it('候选数量不一致时不捕获也不错误替换', async () => {
    const { clone, source } = roots('<svg><text>一</text></svg><svg><text>二</text></svg>')
    clone.querySelector('svg')?.remove()

    await expect(replaceSvgWithImages(source, clone)).resolves.toEqual([])
    expect(mocks.snapdom).not.toHaveBeenCalled()
    expect(clone.querySelector('svg text')?.textContent).toBe('二')
  })
})
