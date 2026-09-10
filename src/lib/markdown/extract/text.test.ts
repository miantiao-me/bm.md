import { describe, expect, it } from 'vitest'
import { extract } from './text'

describe('markdown -> text extract', () => {
  it('keeps paragraph separation with newlines', async () => {
    const markdown = 'First paragraph.\n\nSecond paragraph.'
    const text = await extract(markdown)

    expect(text).toContain('First paragraph.')
    expect(text).toContain('Second paragraph.')
  })

  it('keeps list items on separate lines', async () => {
    const markdown = '- item one\n- item two'
    const text = await extract(markdown)

    expect(text).toMatch(/item one/)
    expect(text).toMatch(/item two/)
  })

  it('removes markdown formatting while keeping content', async () => {
    const markdown = '**Bold** text with [link](https://example.com).'
    const text = await extract(markdown)

    expect(text).toContain('Bold text with link.')
  })

  it('removes highlight markers while keeping content', async () => {
    const text = await extract('前文 ==高亮== 后文')

    expect(text).toContain('前文 高亮 后文')
    expect(text).not.toContain('==')
  })

  it.each(['**', '__', '*', '_', '~~'])('提取高亮与 %s 双向嵌套的正文', async (delimiter) => {
    expect(await extract(`==${delimiter}中文${delimiter}== ${delimiter}==English==${delimiter}`)).toBe('中文 English')
  })

  it('提取多重嵌套并保留代码和词内下划线', async () => {
    expect(await extract('**==~~*中文*~~==** ==`**code**`== ==foo_bar_baz==')).toBe('中文 **code** foo_bar_baz')
  })

  it.each([
    ['前文==**高亮文本**==后文', '前文高亮文本后文'],
    ['前文**==高亮文本==**后文', '前文高亮文本后文'],
    ['before==_text_==after', 'beforetextafter'],
    ['before_==text==_after', 'before_text_after'],
    ['前文==**未配对==后文', '前文**未配对后文'],
  ])('提取贴邻正文的嵌套高亮：%s', async (markdown, expected) => {
    expect(await extract(markdown)).toBe(expected)
  })

  it('extracts text from headings', async () => {
    const markdown = '# 一级标题\n\n## 二级标题'
    const text = await extract(markdown)

    expect(text).toContain('一级标题')
    expect(text).toContain('二级标题')
    expect(text).not.toContain('#')
  })

  it('removes image syntax from text', async () => {
    const markdown = '这是一张 ![示例图片](https://example.com/img.png) 图片'
    const text = await extract(markdown)

    expect(text).not.toContain('![')
    expect(text).not.toContain('https://example.com')
  })

  it('extracts text from blockquotes', async () => {
    const markdown = '> 这是一段引用\n>\n> 引用第二行'
    const text = await extract(markdown)

    expect(text).toContain('这是一段引用')
    expect(text).toContain('引用第二行')
    expect(text).not.toContain('>')
  })

  it('extracts code content without fence markers', async () => {
    const markdown = '```javascript\nconst x = 1\n```'
    const text = await extract(markdown)

    expect(text).toContain('const x = 1')
    expect(text).not.toContain('```')
  })

  it('handles empty input', async () => {
    const text = await extract('')
    expect(text).toBe('')
  })

  it('preserves Chinese characters and emoji', async () => {
    const markdown = '你好世界 🎉 **加粗中文**'
    const text = await extract(markdown)

    expect(text).toContain('你好世界')
    expect(text).toContain('🎉')
    expect(text).toContain('加粗中文')
  })
})
