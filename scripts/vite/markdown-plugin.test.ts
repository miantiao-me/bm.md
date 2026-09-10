import { describe, expect, it } from 'vitest'
import { renderBuildMarkdown } from './markdown-plugin'

describe('构建期 Markdown 扩展', () => {
  it.each([
    ['前文==**高亮文本**==后文', '前文<mark><strong>高亮文本</strong></mark>后文'],
    ['前文**==高亮文本==**后文', '前文<strong><mark>高亮文本</mark></strong>后文'],
    ['before==__text__==after', 'before<mark><strong>text</strong></mark>after'],
    ['before__==text==__after', 'before__<mark>text</mark>__after'],
    ['before==*text*==after', 'before<mark><em>text</em></mark>after'],
    ['before==_text_==after', 'before<mark><em>text</em></mark>after'],
    ['before==~~text~~==after', 'before<mark><del>text</del></mark>after'],
    ['前文==**未配对==后文', '前文<mark>**未配对</mark>后文'],
    ['前文==文本\\*==后文', '前文==文本*==后文'],
    ['前文===**文本**===后文', '前文===<strong>文本</strong>===后文'],
  ])('正文贴邻格式边界：%s', async (markdown, content) => {
    expect(await renderBuildMarkdown(markdown)).toBe(`<p>${content}</p>`)
  })

  describe.each(['中文文本', 'English text'])('双向嵌套：%s', (text) => {
    it.each([
      ['**', 'strong'],
      ['__', 'strong'],
      ['*', 'em'],
      ['_', 'em'],
      ['~~', 'del'],
    ])('支持 %s 与高亮两种包裹方向', async (delimiter, tag) => {
      const html = await renderBuildMarkdown(`==${delimiter}${text}${delimiter}==\n\n${delimiter}==${text}==${delimiter}`)

      expect(html).toBe(`<p><mark><${tag}>${text}</${tag}></mark></p>\n<p><${tag}><mark>${text}</mark></${tag}></p>`)
    })
  })

  it.each([
    ['**==~~*多重嵌套*~~==**', '<strong><mark><del><em>多重嵌套</em></del></mark></strong>'],
    ['==`**代码**`==', '<mark><code>**代码**</code></mark>'],
    ['**`==code==`**', '<strong><code>==code==</code></strong>'],
    ['==\\*斜体\\*==', '<mark>*斜体*</mark>'],
    ['**\\==text==**', '<strong>==text==</strong>'],
    ['==**未闭合**', '==<strong>未闭合</strong>'],
    ['==**未闭合==', '<mark>**未闭合</mark>'],
    ['== **空白**==', '== <strong>空白</strong>=='],
    ['==**空白** ==', '==<strong>空白</strong> =='],
    ['**== ==**', '<strong>== ==</strong>'],
    ['==_ 空白_==', '<mark>_ 空白_</mark>'],
    ['==__空白　__==', '<mark>__空白　__</mark>'],
    ['==_中文\nEnglish_==', '<mark><em>中文\nEnglish</em></mark>'],
    ['====', '===='],
    ['==foo_bar_baz 中文__粗体__后文==', '<mark>foo_bar_baz 中文__粗体__后文</mark>'],
    ['==++下划线++==', '<mark>++下划线++</mark>'],
    ['==<ins>下划线</ins>==', '<mark>下划线</mark>'],
    ['<ins>==下划线==</ins>', '<mark>下划线</mark>'],
  ])('保留边界契约（构建端不保留原生 HTML）：%s', async (markdown, content) => {
    expect(await renderBuildMarkdown(markdown)).toBe(`<p>${content}</p>`)
  })

  it('与运行时共享图片尺寸和高亮语法', async () => {
    const html = await renderBuildMarkdown('![说明|320x180](/image.png "标题")\n\n==**粗体**==')

    expect(html).toContain('<img src="/image.png" alt="说明" title="标题" width="320" height="180">')
    expect(html).toContain('<mark><strong>粗体</strong></mark>')
  })
})
