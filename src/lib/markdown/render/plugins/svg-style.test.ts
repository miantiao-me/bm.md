import type { Element } from 'hast'
import { describe, expect, it } from 'vitest'
import { applyDiagramFontFamily, applyRootFontFamily, makeSvgResponsive } from './svg-style'

function createSvg(width?: string | number): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: width === undefined ? {} : { width, height: '100' },
    children: [],
  }
}

// beautiful-mermaid 输出的内部 <style> 形状（@import 行已被 sanitizer 剥离）
const MERMAID_STYLE_VALUE = `
  text { font-family: 'Inter', system-ui, sans-serif; }
  .mono { font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace; }
  svg {
    --_text: var(--fg);
  }
`

function createSvgWithStyle(styleValue: string): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'style',
        properties: {},
        children: [{ type: 'text', value: styleValue }],
      },
    ],
  }
}

function getStyleValue(svg: Element): string {
  const style = svg.children.find(child => child.type === 'element' && child.tagName === 'style') as Element
  return (style.children[0] as { value: string }).value
}

describe('makeSvgResponsive', () => {
  it.each([275, '275', '275px', ' 275.5px '])('limits SVG width to its natural width from %s', (width) => {
    const svg = createSvg(width)

    makeSvgResponsive(svg)

    expect(svg.properties).not.toHaveProperty('width')
    expect(svg.properties).not.toHaveProperty('height')
    const expectedWidth = width === ' 275.5px ' ? '275.5px' : '275px'
    expect(svg.properties.style).toContain(`width:100%;max-width:${expectedWidth};height:auto;display:block;margin:0 auto;`)
  })

  it.each(['100%', '2em', '0', -1])('falls back to container width for invalid width %s', (width) => {
    const svg = createSvg(width)

    makeSvgResponsive(svg)

    expect(svg.properties.style).toContain('width:100%;max-width:100%;height:auto;display:block;margin:0 auto;')
  })

  it('falls back to container width for a viewBox-only SVG', () => {
    const svg = createSvg()
    svg.properties.viewBox = '0 0 275 100'

    makeSvgResponsive(svg)

    expect(svg.properties.style).toContain('width:100%;max-width:100%;height:auto;display:block;margin:0 auto;')
  })
})

describe('applyDiagramFontFamily', () => {
  it('重写 text 规则的 font-family 为排版风格栈', () => {
    const svg = createSvgWithStyle(MERMAID_STYLE_VALUE)
    const stack = 'Georgia, \'Songti SC\', serif'

    applyDiagramFontFamily(svg, stack)

    const value = getStyleValue(svg)
    expect(value).toContain(`text { font-family: ${stack};`)
    expect(value).not.toContain('Inter')
  })

  it('不触碰 .mono 与 svg 等其他规则', () => {
    const svg = createSvgWithStyle(MERMAID_STYLE_VALUE)

    applyDiagramFontFamily(svg, 'Georgia, serif')

    const value = getStyleValue(svg)
    expect(value).toContain('.mono { font-family: \'JetBrains Mono\'')
    expect(value).toContain('--_text: var(--fg);')
  })

  it('未传入字体栈时保持原样', () => {
    const svg = createSvgWithStyle(MERMAID_STYLE_VALUE)

    applyDiagramFontFamily(svg, undefined)

    expect(getStyleValue(svg)).toBe(MERMAID_STYLE_VALUE)
  })

  it('无 style 子元素时安全跳过', () => {
    const svg = createSvg()

    expect(() => applyDiagramFontFamily(svg, 'Georgia, serif')).not.toThrow()
  })

  it('能处理嵌套在 g 内的 style 元素', () => {
    const innerStyle: Element = {
      type: 'element',
      tagName: 'style',
      properties: {},
      children: [{ type: 'text', value: MERMAID_STYLE_VALUE }],
    }
    const svg: Element = {
      type: 'element',
      tagName: 'svg',
      properties: {},
      children: [{
        type: 'element',
        tagName: 'g',
        properties: {},
        children: [innerStyle],
      }],
    }

    applyDiagramFontFamily(svg, 'Georgia, serif')

    expect((innerStyle.children[0] as { value: string }).value).toContain('text { font-family: Georgia, serif;')
  })
})

describe('applyRootFontFamily', () => {
  it('只设置根 SVG 的 font-family 属性', () => {
    const svg = createSvgWithStyle(MERMAID_STYLE_VALUE)

    applyRootFontFamily(svg, 'sans-serif')

    expect(svg.properties.fontFamily).toBe('sans-serif')
    expect(getStyleValue(svg)).toBe(MERMAID_STYLE_VALUE)
  })
})
