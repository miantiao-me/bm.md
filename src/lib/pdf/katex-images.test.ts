// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { replaceKatexWithImages } from './katex-images'

const mocks = vi.hoisted(() => ({
  capturedWhiteSpaces: [] as string[],
  moduleLoads: 0,
  snapdom: vi.fn(),
}))

vi.mock('@zumer/snapdom', () => {
  mocks.moduleLoads++
  return { snapdom: mocks.snapdom }
})

function roots(html: string) {
  const source = document.createElement('div')
  source.innerHTML = html
  document.body.append(source)
  return { clone: source.cloneNode(true) as HTMLElement, source }
}

function rect(width: number, bottom = 20): DOMRect {
  return { bottom, height: 20, left: 0, right: width, top: 0, width, x: 0, y: 0, toJSON: vi.fn() }
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
  mocks.moduleLoads = 0
  mocks.capturedWhiteSpaces = []
  mocks.snapdom.mockReset().mockImplementation((element: HTMLElement) => {
    mocks.capturedWhiteSpaces.push(element.style.getPropertyValue('white-space'))
    return Promise.resolve({
      toBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
    })
  })
  vi.spyOn(URL, 'createObjectURL')
    .mockImplementationOnce(() => 'blob:formula-1')
    .mockImplementationOnce(() => 'blob:formula-2')
    .mockImplementationOnce(() => 'blob:formula-3')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 16))
})

describe('pdf katex 图片快照', () => {
  it('无 metadata 公式时不加载 snapdom 模块', async () => {
    const { clone, source } = roots('<span class="katex">x</span>')
    await expect(replaceKatexWithImages(source, clone)).resolves.toEqual([])
    expect(mocks.moduleLoads).toBe(0)
    expect(mocks.snapdom).not.toHaveBeenCalled()
  })

  it('以不透明背景和 dpr2 捕获行内和块公式，并保留 baseline、margin 与 TeX alt', async () => {
    const { clone, source } = roots(`
      <span style="white-space:pre-wrap" data-bm-rich="katex" data-bm-hash="inline"><annotation encoding="application/x-tex">x^2</annotation></span>
      <span class="katex-display" data-bm-rich="katex" data-bm-hash="display">y</span>
    `)
    const [inline, display] = Array.from(source.querySelectorAll<HTMLElement>('[data-bm-rich="katex"]'))
    const setInlineProperty = vi.spyOn(inline.style, 'setProperty')
    inline.getBoundingClientRect = vi.fn().mockReturnValue(rect(100, 20))
    display.getBoundingClientRect = vi.fn().mockReturnValue(rect(320, 40))
    display.style.marginTop = '12px'
    display.style.marginBottom = '18px'

    await expect(replaceKatexWithImages(source, clone)).resolves.toEqual(['blob:formula-1', 'blob:formula-2'])
    expect(mocks.snapdom).toHaveBeenCalledTimes(2)
    expect(mocks.snapdom).toHaveBeenNthCalledWith(1, inline, {
      backgroundColor: 'rgb(255, 255, 255)',
      dpr: 2,
      embedFonts: true,
    })
    expect(mocks.capturedWhiteSpaces).toEqual(['nowrap', ''])
    expect(setInlineProperty).toHaveBeenNthCalledWith(1, 'white-space', 'nowrap', 'important')
    expect(setInlineProperty).toHaveBeenNthCalledWith(2, 'white-space', 'pre-wrap', '')
    expect(inline.style.getPropertyValue('white-space')).toBe('pre-wrap')
    expect(inline.style.getPropertyPriority('white-space')).toBe('')
    for (const result of await Promise.all(mocks.snapdom.mock.results.map(item => item.value)))
      expect(result.toBlob).toHaveBeenCalledWith({ dpr: 2, type: 'png' })

    const inlineImage = clone.querySelector<HTMLImageElement>('.bm-pdf-katex-inline')!
    expect(inlineImage.alt).toBe('x^2')
    expect(inlineImage.getAttribute('style')).toContain('width:100px')
    expect(inlineImage.getAttribute('style')).toContain('vertical-align:-20px')
    const displayImage = clone.querySelector<HTMLImageElement>('.bm-pdf-katex-display')!
    expect(displayImage.alt).toBe('数学公式')
    expect(displayImage.getAttribute('style')).toContain('width:320px')
    expect(displayImage.getAttribute('style')).toContain('margin-top:12px')
    expect(displayImage.getAttribute('style')).toContain('margin-bottom:18px')
    expect(inlineImage.getAttribute('style')).not.toContain('!important')
    expect(displayImage.getAttribute('style')).not.toContain('!important')
    expect(inlineImage.getAttribute('style')).not.toMatch(/padding|border/)
    expect(displayImage.getAttribute('style')).not.toMatch(/padding|border/)
    expect(source.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('透明父层继承深色祖先背景', async () => {
    const { clone, source } = roots(`
      <section style="background-color:rgb(20, 30, 40)">
        <div style="background-color:rgba(0, 0, 0, 0)">
          <i data-bm-rich="katex" data-bm-hash="a">x</i>
        </div>
      </section>
    `)

    await replaceKatexWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      backgroundColor: 'rgb(20, 30, 40)',
    }))
  })

  it('按外层到内层合成半透明祖先背景', async () => {
    const { clone, source } = roots(`
      <section style="background-color:rgb(20, 40, 60)">
        <div style="background-color:rgba(220, 140, 60, 0.5)">
          <i data-bm-rich="katex" data-bm-hash="a">x</i>
        </div>
      </section>
    `)

    await replaceKatexWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      backgroundColor: 'rgb(120, 90, 60)',
    }))
  })

  it('全透明祖先背景回退为白色', async () => {
    const { clone, source } = roots(`
      <div style="background-color:rgba(1, 2, 3, 0)">
        <i data-bm-rich="katex" data-bm-hash="a">x</i>
      </div>
    `)

    await replaceKatexWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      backgroundColor: 'rgb(255, 255, 255)',
    }))
  })

  it('非法祖先背景回退为白色', async () => {
    const { clone, source } = roots(`
      <div>
        <i data-bm-rich="katex" data-bm-hash="a">x</i>
      </div>
    `)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'rgb(1, 2, nope)',
    } as CSSStyleDeclaration)

    await replaceKatexWithImages(source, clone)

    expect(mocks.snapdom).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      backgroundColor: 'rgb(255, 255, 255)',
    }))
  })

  it('行内捕获失败时恢复原 white-space 值与优先级', async () => {
    const { clone, source } = roots('<i style="white-space:normal!important;color:red" data-bm-rich="katex" data-bm-hash="a">x</i>')
    const formula = source.querySelector<HTMLElement>('[data-bm-rich="katex"]')!
    formula.getBoundingClientRect = vi.fn().mockReturnValue(rect(20))
    vi.spyOn(formula.style, 'getPropertyPriority').mockReturnValue('important')
    const setFormulaProperty = vi.spyOn(formula.style, 'setProperty')
    mocks.snapdom.mockImplementationOnce((element: HTMLElement) => {
      expect(element.style.getPropertyValue('white-space')).toBe('nowrap')
      expect(element.style.getPropertyPriority('white-space')).toBe('important')
      return Promise.reject(new Error('capture failed'))
    })

    await expect(replaceKatexWithImages(source, clone)).rejects.toMatchObject({ kind: 'snapshotFailed' })
    expect(formula.style.getPropertyValue('white-space')).toBe('normal')
    expect(formula.style.getPropertyPriority('white-space')).toBe('important')
    expect(setFormulaProperty).toHaveBeenNthCalledWith(1, 'white-space', 'nowrap', 'important')
    expect(setFormulaProperty).toHaveBeenNthCalledWith(2, 'white-space', 'normal', 'important')
    expect(formula.style.color).toBe('red')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('按 DOM 顺序处理 hash 相同的重复公式', async () => {
    const html = '<i data-bm-rich="katex" data-bm-hash="same">a</i><i data-bm-rich="katex" data-bm-hash="same">a</i>'
    const { clone, source } = roots(html)
    const formulas = Array.from(source.querySelectorAll<HTMLElement>('[data-bm-rich="katex"]'))
    formulas.forEach(element => element.getBoundingClientRect = vi.fn().mockReturnValue(rect(10)))

    await replaceKatexWithImages(source, clone)
    expect(mocks.snapdom.mock.calls.map(call => call[0])).toEqual(formulas)
    expect(clone.querySelectorAll('img')).toHaveLength(2)
  })

  it.each([
    ['数量', '<i data-bm-rich="katex" data-bm-hash="a"></i>', ''],
    ['hash', '<i data-bm-rich="katex" data-bm-hash="a"></i>', '<i data-bm-rich="katex" data-bm-hash="b"></i>'],
    ['display', '<i class="katex-display" data-bm-rich="katex" data-bm-hash="a"></i>', '<i data-bm-rich="katex" data-bm-hash="a"></i>'],
  ])('%s 不一致时拒绝快照', async (_name, sourceHtml, cloneHtml) => {
    const { clone, source } = roots(sourceHtml)
    clone.innerHTML = cloneHtml
    await expect(replaceKatexWithImages(source, clone)).rejects.toMatchObject({
      kind: 'snapshotFailed',
      message: '数学公式快照失败，请刷新后重试',
    })
    expect(mocks.snapdom).not.toHaveBeenCalled()
  })

  it('部分失败时撤销已创建 URL 并且不返回原公式降级结果', async () => {
    const html = '<i data-bm-rich="katex" data-bm-hash="a"></i><i data-bm-rich="katex" data-bm-hash="b"></i>'
    const { clone, source } = roots(html)
    source.querySelectorAll<HTMLElement>('[data-bm-rich="katex"]')
      .forEach(element => element.getBoundingClientRect = vi.fn().mockReturnValue(rect(10)))
    mocks.snapdom
      .mockResolvedValueOnce({ toBlob: vi.fn().mockResolvedValue(new Blob(['png'])) })
      .mockResolvedValueOnce({ toBlob: vi.fn().mockResolvedValue(new Blob([])) })

    await expect(replaceKatexWithImages(source, clone)).rejects.toMatchObject({ kind: 'snapshotFailed' })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:formula-1')
    expect(clone.querySelectorAll('img')).toHaveLength(1)
  })
})
