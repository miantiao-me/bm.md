import { describe, expect, it } from 'vitest'
import { applyDarkModeToPreviewHtml } from './darkmode'
import {
  convertBackgroundColor,
  convertForegroundColor,
  convertLineColor,
  DEFAULT_DARK_BACKGROUND,
  parseColor,
  serializeColor,
} from './darkmode-colors'

describe('暗色纯颜色运算', () => {
  it.each([
    ['#abc', 'rgb(170, 187, 204)'],
    ['#abcd', 'rgba(170, 187, 204, 0.867)'],
    ['#11223380', 'rgba(17, 34, 51, 0.502)'],
    ['rgb(100% 0% 50% / 25%)', 'rgba(255, 0, 127, 0.25)'],
    ['rgba(300, -1, 2.6, 2)', 'rgb(255, 0, 3)'],
    ['hsl(-120 100% 50% / 50%)', 'rgba(0, 0, 255, 0.5)'],
    [' WHITE ', 'rgb(255, 255, 255)'],
    ['transparent', 'rgba(0, 0, 0, 0)'],
  ])('保留 %s 的解析、舍入与 alpha', (input, expected) => {
    expect(serializeColor(parseColor(input)!)).toBe(expected)
  })

  it.each(['', 'inherit', 'initial', 'unset', 'currentColor', 'var(--color)', '#12'])('不解析 %s', (input) => {
    expect(parseColor(input)).toBeNull()
  })

  it.each([
    ['#fff', 'rgb(17, 17, 17)'],
    ['#dcdcdc', 'rgb(30, 30, 30)'],
    ['#808080', 'rgb(74, 74, 74)'],
    ['#000', 'rgb(20, 20, 20)'],
  ])('背景 %s 保留亮度分段策略', (input, expected) => {
    expect(serializeColor(convertBackgroundColor(parseColor(input)!))).toBe(expected)
  })

  it('前景与线条使用不同对比度策略并保留透明度', () => {
    const red = parseColor('rgba(255, 0, 0, 0.5)')!
    expect(serializeColor(convertForegroundColor(red, DEFAULT_DARK_BACKGROUND))).toBe('rgba(247, 171, 171, 0.5)')
    expect(serializeColor(convertLineColor(red, DEFAULT_DARK_BACKGROUND))).toBe('rgba(231, 106, 106, 0.5)')
    const transparent = parseColor('transparent')!
    expect(convertBackgroundColor(transparent)).toEqual(transparent)
    expect(convertForegroundColor(transparent, DEFAULT_DARK_BACKGROUND)).toEqual(transparent)
    expect(convertLineColor(transparent, DEFAULT_DARK_BACKGROUND)).toEqual(transparent)
  })

  it('没有 DOM 时公开转换保持原始输入', () => {
    const html = '<p style="color: black">正文</p>'
    expect(applyDarkModeToPreviewHtml(html)).toBe(html)
  })
})
