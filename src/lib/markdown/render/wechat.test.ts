import { describe, expect, it } from 'vitest'
import { render } from './html'

function renderWechat(markdown: string): Promise<string> {
  return render({ markdown, platform: 'wechat' })
}

function expectNoNativeLists(html: string): void {
  expect(html).not.toMatch(/<(?:ol|ul|li)(?:\s|>)/)
  expect(html).not.toContain('list-style')
}

describe('wechat render adapter', () => {
  it('converts external links to footnotes and removes href', async () => {
    const html = await render({
      markdown: '[示例](https://example.com)',
      platform: 'wechat',
    })

    expect(html).not.toContain('href="https://example.com"')
    expect(html).toContain('<span>示例</span>')
    expect(html).toMatch(/<sup[^>]*>\[1\]<\/sup>/)
    expect(html).toContain('References')
    expect(html).toContain('https://example.com')
  })

  it('keeps mp.weixin links clickable and not footnoted', async () => {
    const html = await render({
      markdown: '[公众号](https://mp.weixin.qq.com/s/abc)',
      platform: 'wechat',
    })

    expect(html).toContain('href="https://mp.weixin.qq.com/s/abc"')
    expect(html).not.toContain('footnote-ref')
    expect(html).not.toContain('References')
  })

  it('footnotes mailto and tel links', async () => {
    const html = await render({
      markdown: '[邮件](mailto:test@example.com) [电话](tel:123)',
      platform: 'wechat',
    })

    expect(html).not.toContain('href="mailto:test@example.com"')
    expect(html).not.toContain('href="tel:123"')
    expect(html).toContain('mailto:test@example.com')
    expect(html).toContain('tel:123')
    expect(html).toContain('References')
  })

  it('reuses footnote id for duplicate links', async () => {
    const html = await render({
      markdown: '[链接1](https://example.com) 和 [链接2](https://example.com)',
      platform: 'wechat',
    })

    expect(html.match(/\[1\]/g)).toHaveLength(2)
    expect(html).not.toContain('[2]')
    expect(html.match(/https:\/\/example\.com/g)).toHaveLength(1)
  })

  it('degrades unordered, ordered, and mixed nested lists to text-marked sections', async () => {
    const html = await renderWechat('- a\n  1. b\n  2. c\n- d\n\n1. one\n   - nested')

    expect(html).toContain('• a')
    expect(html).toContain('1. b')
    expect(html).toContain('2. c')
    expect(html).toContain('1. one')
    expect(html).toContain('• nested')
    expect(html).toMatch(/padding-left: 4em; text-indent: -2em;/)
  })

  it('renders checked, unchecked, and empty GFM tasks as text markers', async () => {
    const html = await renderWechat('- [x] done\n- [ ] todo\n- [x] <!-- empty -->')

    expect(html).toContain('☑ done')
    expect(html).toContain('☐ todo')
    expect(html).toContain('☑ ')
    expect(html).not.toContain('<input')
    expectNoNativeLists(html)
  })

  it('preserves multi-paragraph, block, and inline list content', async () => {
    const html = await renderWechat('- **strong** and *em* with `code` and $E=mc^2$\n\n  second paragraph\n\n  > quote')

    expect(html).toContain('<strong>strong</strong>')
    expect(html).toContain('<em>em</em>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('class="katex"')
    expect(html).toContain('second paragraph')
    expect(html).toContain('<blockquote>')
  })

  it('degrades both markdown and generated link footnote lists', async () => {
    const html = await render({
      markdown: '正文脚注[^note]和[链接](https://example.com)。\n\n[^note]: 脚注内容',
      platform: 'wechat',
    })

    expect(html).toContain('脚注内容')
    expect(html).toContain('References')
    expect(html).toContain('https://example.com')
    expectNoNativeLists(html)
  })

  it('keeps multi-paragraph footnote markers on the first paragraph only', async () => {
    const html = await render({
      markdown: '正文[^note]\n\n[^note]: 第一段\n\n    第二段',
      platform: 'wechat',
    })

    expect(html).toMatch(/text-indent: -2em;">1\. 第一段<\/section>/)
    expect(html).toMatch(/text-indent: 0;">\u00A0{2}第二段\s*<\/section>/)
    expect(html).not.toMatch(/<section[^>]*>\s*<\/section>/)
  })

  it('does not emit native list tags or list-style for wechat', async () => {
    const html = await render({
      markdown: '1. one\n2. two\n\n- three',
      platform: 'wechat',
    })

    expectNoNativeLists(html)
  })

  it('keeps native lists for html platform', async () => {
    const html = await render({
      markdown: '1. one\n2. two\n\n- three',
      platform: 'html',
    })

    expect(html).toContain('<ol>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>')
  })

  it('wraps tables with overflow container', async () => {
    const html = await render({
      markdown: '|a|b|\n|---|---|\n|1|2|',
      platform: 'wechat',
    })

    expect(html).toMatch(/<figure[^>]*class="figure-table"[^>]*>\s*<table/)
  })

  it('converts code block newlines to br elements', async () => {
    const html = await render({
      markdown: '```js\nconst a = 1\nconst b = 2\n```',
      platform: 'wechat',
    })

    expect(html).toContain('<br>')
    expect(html).not.toMatch(/<code[^>]*>[^<]*\n/)
  })

  it('converts leading spaces in code to nbsp', async () => {
    const html = await render({
      markdown: '```js\n  const a = 1\n```',
      platform: 'wechat',
    })

    expect(html).toContain('\u00A0\u00A0')
  })

  it('handles CRLF in code blocks', async () => {
    const html = await render({
      markdown: '```js\r\nconst a = 1\r\n```',
      platform: 'wechat',
    })

    expect(html).not.toContain('\r')
    expect(html).toContain('<br>')
  })

  it('保留 Obsidian 图片尺寸和高亮标记', async () => {
    const html = await renderWechat('![说明|320x180](/image.png)\n\n==**高亮**==')

    expect(html).toMatch(/<img[^>]*alt="说明"[^>]*width="320"[^>]*height="180"/)
    expect(html).toMatch(/<figcaption><span>说明<\/span><\/figcaption>/)
    expect(html).toContain('<mark><strong>高亮</strong></mark>')
  })
})

describe('katex rendering', () => {
  it('renders math expressions with KaTeX classes', async () => {
    const html = await render({
      markdown: 'Inline $E=mc^2$',
      platform: 'wechat',
    })

    expect(html).toContain('class="katex"')
    expect(html).toContain('katex-html')
  })
})
