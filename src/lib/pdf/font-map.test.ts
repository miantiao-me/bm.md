import { describe, expect, it } from 'vitest'
import { emfontMapping, EXTRA_FONT_FAMILIES, googleFontFamily, languageFontStyle, mappedFontFamilies, rewriteFontFamily } from './font-map'

describe('pDF 字体替身表', () => {
  it('大小写不敏感，去引号、按顺序替换去重并丢弃未知名', () => {
    expect(mappedFontFamilies(`'GEORGIA', Georgia, Unknown, "Times New Roman", serif`))
      .toEqual(['Gelasio', 'Tinos', 'Noto Serif SC', ...EXTRA_FONT_FAMILIES])
  })

  it.each([
    ['Palatino Linotype', 'Literata', 'Noto Serif SC'],
    ['Arial', 'Inter', 'Noto Sans SC'],
    ['Menlo, Songti SC, monospace', 'Fira Mono', 'Noto Serif SC'],
    ['Consolas, monospace', 'Fira Mono', 'Noto Sans SC'],
    ['Unknown', 'Noto Sans SC', 'Noto Sans SC'],
  ])('为 %s 补齐对应 CJK 栈', (source, first, cjk) => {
    const result = mappedFontFamilies(source)
    expect(result[0]).toBe(first)
    expect(result).toContain(cjk)
    expect(result.slice(-4)).toEqual(EXTRA_FONT_FAMILIES)
  })

  it('按语言选择 CJK，保留通用族与固定补字名', () => {
    const result = rewriteFontFamily('Menlo, Songti SC, monospace !important', 'ja')
    expect(result).toContain('"Fira Mono"')
    expect(result).toContain('"Noto Serif JP"')
    expect(result).toContain('"bm.md Fallback", monospace !important')
  })

  it.each(['inherit', ' INITIAL !important', 'var(--font)'])('保留继承关键字和变量 %s', (value) => {
    expect(rewriteFontFamily(value)).toBe(value)
  })

  it('lang 元素同时改区域变量并重新声明自己的字体栈', () => {
    const style = languageFontStyle('Georgia, "Songti SC", serif', 'ja')
    expect(style).toContain('--bm-pdf-serif: "Noto Serif JP"; --bm-pdf-sans: "Noto Sans JP";')
    expect(style).toContain('font-family: "Gelasio", var(--bm-pdf-serif, "Noto Serif JP")')
  })

  it('google 字重和斜体规格独立配置', () => {
    expect(googleFontFamily('Gelasio')).toMatchObject({ weight: '400..700', style: ['normal', 'italic'] })
    expect(googleFontFamily('Literata')).toMatchObject({ weight: '200..900' })
    expect(googleFontFamily('Tinos')).toMatchObject({ weight: [400, 700], style: ['normal', 'italic'] })
    expect(googleFontFamily('Fira Mono')).toMatchObject({ weight: [400, 500, 700] })
  })

  it('备用源映射包含区域独立字重', () => {
    expect(emfontMapping('Gelasio')).toEqual({ id: 'LXGWNeoZhiSong', weights: [400] })
    expect(emfontMapping('Noto Sans JP')).toEqual({ id: 'GenYoGothicJP', weights: [200, 300, 350, 400, 500, 700, 900] })
    expect(emfontMapping('Noto Sans Math').id).toBe('GNUUnifont')
  })
})
