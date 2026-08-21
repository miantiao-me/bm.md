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
  it('保留原生 margin 所需的无 padding 根布局和关键分页规则', () => {
    const css = createPdfStyles(false)
    expect(css).toContain('#bm-md {\n  width: 100%;\n  max-width: 100%;\n  box-sizing: border-box;')
    expect(css).not.toContain('padding: 45px 30px')
    expect(css).not.toContain('position: fixed')
    expect(css).toContain('#bm-md p, #bm-md li { orphans: 3; widows: 3; }')
    expect(css).toContain('#bm-md tr { break-inside: avoid; }')
    expect(css).toContain('white-space: pre-wrap')
  })

  it('选择首个不透明基础背景色并在全部透明时回退白色', () => {
    expect(selectBackgroundColor(['transparent', 'rgb(0 0 0 / 0)', 'rgb(20, 30, 40)']))
      .toBe('rgb(20, 30, 40)')
    expect(selectBackgroundColor(['transparent', '#00000000'])).toBe('#ffffff')
  })
})
