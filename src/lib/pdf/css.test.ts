import { describe, expect, it } from 'vitest'
import { createPdfStyles, sanitizeCss, selectBackgroundColor } from './css'

describe('takumi CSS 兼容', () => {
  it('只转换 overflow 声明中的 auto 与 scroll', () => {
    const css = '.a { overflow: auto scroll; overflow-x: scroll !important; overflow-y: hidden; }'
    expect(sanitizeCss(css))
      .toBe('.a { overflow: visible visible; overflow-x: visible !important; overflow-y: hidden; }')
  })

  it('支持声明前注释、属性与冒号间注释以及嵌套规则', () => {
    const css = '@media print { .a { /* before */ overflow-x /* colon */ : auto; } }'
    expect(sanitizeCss(css))
      .toBe('@media print { .a { /* before */ overflow-x /* colon */ : visible; } }')
  })

  it('不修改选择器、字符串、URL、函数参数或自定义属性', () => {
    const css = '[data-x="overflow:auto"]::before { '
      + 'content: "overflow-x: scroll"; '
      + '--overflow: auto scroll; '
      + 'background: url("https://example.com/overflow:auto.png"); '
      + 'overflow: var(--overflow); }'
    expect(sanitizeCss(css)).toBe(css)
  })
})

describe('pdf 页面样式', () => {
  it('版心清零 padding 并保留分页与折行必需规则', () => {
    const css = createPdfStyles({ bodySerif: false })
    expect(css).toContain('#bm-md {\n  padding: 0;\n}')
    expect(css).toContain('#bm-md p, #bm-md li { orphans: 3; widows: 3; }')
    expect(css).toContain('box-decoration-break: clone')
    expect(css).toContain('white-space: pre-wrap')
    expect(css).toContain('overflow-wrap: break-word')
    expect(css).toContain('#bm-md table { width: 100%; max-width: 100%; overflow-x: visible; }')
    expect(css).toContain('#bm-md tr { break-inside: avoid; }')
    expect(css).toContain('#bm-md hr { break-inside: avoid; }')
    expect(css).toContain('#bm-md img, #bm-md svg { max-width: 100%; height: auto; }')
  })

  it('不再生成覆盖主题节奏的排版规则', () => {
    const css = createPdfStyles({ bodySerif: true })
    expect(css).not.toContain('line-height')
    expect(css).not.toMatch(/#bm-md h[1-6][^{]*\{[^}]*margin/)
    expect(css).not.toMatch(/#bm-md p[^{]*\{[^}]*margin/)
    expect(css).not.toContain('box-sizing')
    expect(css).not.toContain('first-child')
  })

  it('按最近祖先语言覆盖目标正文、标题和代码元素，且不影响 KaTeX', () => {
    const css = createPdfStyles({ bodySerif: false, headingSerif: true })
    expect(css).toContain('#bm-md, #bm-md p, #bm-md li, #bm-md blockquote, #bm-md table {\n  font-family: "Noto Sans SC"')
    expect(css).toContain('#bm-md h1, #bm-md h2, #bm-md h3, #bm-md h4, #bm-md h5, #bm-md h6 {\n  font-family: "Noto Serif SC"')
    expect(css).toContain('#bm-md p:lang(ja)')
    expect(css).toContain('#bm-md h1:lang(ko)')
    expect(css).toContain('#bm-md pre:lang(zh-HK)')
    expect(css).toContain('#bm-md code:lang(zh-HK)')
    expect(css).toContain('#bm-md kbd:lang(zh-HK)')
    expect(css).toContain('#bm-md samp:lang(zh-HK)')
    expect(css).not.toMatch(/#bm-md\s+:lang/)
    expect(css).not.toMatch(/#bm-md\s+\[lang/)
    expect(css).not.toContain('#bm-md span:lang')
    expect(css).not.toContain('.katex')
  })

  it('公式图片在通用图片规则之后清除主题装饰并保持行内和块布局', () => {
    const css = createPdfStyles({ bodySerif: false })
    expect(css.indexOf('img.bm-pdf-katex-inline')).toBeGreaterThan(css.indexOf('#bm-md img, #bm-md svg'))
    expect(css).toContain('padding: 0 !important')
    expect(css).toContain('border-width: 0 !important')
    expect(css).toContain('border-style: none !important')
    expect(css).toContain('border-color: transparent !important')
    expect(css).not.toContain('border: 0 !important')
    expect(css).toContain('border-radius: 0 !important')
    expect(css).toContain('box-shadow: none !important')
    expect(css).toContain('display: inline-block !important')
    expect(css).toContain('margin: 0 !important')
    expect(css).toContain('margin-left: auto !important')
    expect(css).toContain('break-inside: avoid')
  })

  it('内联图表图片使用专用规则清除主题装饰并保持自适应高度', () => {
    const css = createPdfStyles({ bodySerif: false })
    const rule = css.match(/#bm-md img\.bm-pdf-svg-diagram \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain('padding: 0 !important')
    expect(rule).toContain('border-width: 0 !important')
    expect(rule).toContain('border-radius: 0 !important')
    expect(rule).toContain('box-shadow: none !important')
    expect(rule).toContain('background: transparent !important')
    expect(rule).toContain('height: auto !important')
  })

  it('选择首个不透明基础背景色并在全部透明时回退白色', () => {
    expect(selectBackgroundColor(['transparent', 'rgb(0 0 0 / 0)', 'rgb(20, 30, 40)']))
      .toBe('rgb(20, 30, 40)')
    expect(selectBackgroundColor(['transparent', '#00000000'])).toBe('#ffffff')
  })
})
