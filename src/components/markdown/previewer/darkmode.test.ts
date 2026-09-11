// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyDarkModeToPreviewHtml } from './darkmode'

describe('预览暗色转换公开行为', () => {
  it('保留空白输入', () => {
    expect(applyDarkModeToPreviewHtml(' \n')).toBe(' \n')
  })

  it('默认根背景和前景保持原有转换结果', () => {
    expect(applyDarkModeToPreviewHtml('<section id="bm-md"><p>正文</p></section>'))
      .toBe('<section id="bm-md" style="background-color: rgb(27, 27, 27); color: rgb(184, 184, 184);"><p>正文</p></section>')
  })

  it('保留跳过子树、透明色、重要性和 URL 背景', () => {
    const html = '<section style="background-color: white"><p style="color: black !important; border-top-color: red; background-image: url(&quot;https://example.com/a#fff&quot;)">正文</p><div data-no-dark style="color: black"><b style="color: white">原色</b></div><span style="color: transparent">透明</span></section>'
    const template = document.createElement('template')
    template.innerHTML = applyDarkModeToPreviewHtml(html)
    const root = template.content.firstElementChild as HTMLElement
    const paragraph = root.querySelector('p')!
    expect(root.style.backgroundColor).toBe('rgb(17, 17, 17)')
    expect(paragraph.style.color).toBe('rgb(204, 204, 204)')
    expect(paragraph.style.getPropertyPriority('color')).toBe('important')
    expect(paragraph.style.borderTopColor).toBe('rgb(231, 106, 106)')
    expect(paragraph.style.backgroundImage).toBe('url("https://example.com/a#fff")')
    expect(root.querySelector('div')!.outerHTML).toBe('<div data-no-dark="" style="color: black"><b style="color: white">原色</b></div>')
    expect(root.querySelector('span')!.style.color).toBe('rgba(0, 0, 0, 0)')
  })

  it('保留 alpha、阴影多颜色和渐变转换', () => {
    const html = '<p style="color: rgba(0, 0, 0, 0.4567); box-shadow: 0 1px 2px #fff, 0 0 1px rgba(0, 0, 0, 0.5) !important; background-image: linear-gradient(#fff, #000)">正文</p>'
    const template = document.createElement('template')
    template.innerHTML = applyDarkModeToPreviewHtml(html)
    const paragraph = template.content.firstElementChild as HTMLElement
    expect(paragraph.style.color).toBe('rgba(204, 204, 204, 0.457)')
    expect(paragraph.style.boxShadow).toBe('0 1px 2px rgb(17, 17, 17), 0 0 1px rgba(20, 20, 20, 0.5)')
    expect(paragraph.style.backgroundImage).toBe('linear-gradient(rgb(17, 17, 17), rgb(20, 20, 20))')
  })
})
