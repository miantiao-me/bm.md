import { describe, expect, it } from 'vitest'
import parse from './html'

describe('html -> markdown parse', () => {
  it('converts paragraphs to markdown text', async () => {
    const markdown = await parse('<p>Hello world</p>')
    expect(markdown.trim()).toBe('Hello world')
  })

  it('removes style attributes while keeping text', async () => {
    const markdown = await parse('<span style="color:red">Styled</span>')
    expect(markdown.trim()).toBe('Styled')
  })

  it('converts lists and links with semantics', async () => {
    const html = '<ol><li>First</li><li>Second</li></ol><a href="https://example.com">Example</a>'
    const markdown = await parse(html)

    expect(markdown).toContain('1. First')
    expect(markdown).toContain('2. Second')
    expect(markdown).toContain('[Example](https://example.com)')
  })

  it('converts headings to markdown syntax', async () => {
    const markdown = await parse('<h1>一级标题</h1><h2>二级标题</h2>')

    expect(markdown).toContain('# 一级标题')
    expect(markdown).toContain('## 二级标题')
  })

  it('converts images with alt text', async () => {
    const markdown = await parse('<img src="https://example.com/img.png" alt="示例图片">')

    expect(markdown).toContain('![示例图片](https://example.com/img.png)')
  })

  it('converts bold and italic formatting', async () => {
    const markdown = await parse('<strong>加粗</strong> 和 <em>斜体</em>')

    expect(markdown).toContain('**加粗**')
    expect(markdown).toContain('*斜体*')
  })

  it('converts code blocks with pre and code tags', async () => {
    const markdown = await parse('<pre><code>const x = 1</code></pre>')

    expect(markdown).toContain('const x = 1')
  })

  it('converts unordered lists with bullet marker', async () => {
    const markdown = await parse('<ul><li>项目一</li><li>项目二</li></ul>')

    expect(markdown).toContain('- 项目一')
    expect(markdown).toContain('- 项目二')
  })

  it('sanitizes dangerous script tags', async () => {
    const markdown = await parse('<p>安全内容</p><script>alert("xss")</script>')

    expect(markdown).toContain('安全内容')
    expect(markdown).not.toContain('script')
    expect(markdown).not.toContain('alert')
  })

  it('converts nested blockquotes', async () => {
    const markdown = await parse('<blockquote><p>引用内容</p></blockquote>')

    expect(markdown).toContain('> 引用内容')
  })
})
