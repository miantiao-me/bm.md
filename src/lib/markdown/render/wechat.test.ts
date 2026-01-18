import { describe, expect, it } from 'vitest'
import { render } from './html'

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

  it('keeps nested lists valid', async () => {
    const html = await render({
      markdown: '- a\n  - b',
      platform: 'wechat',
    })

    expect(html).not.toMatch(/<\/li>\s*<(ul|ol)>/)
  })

  it('renders task list checkboxes as symbols', async () => {
    const html = await render({
      markdown: '- [x] done\n- [ ] todo',
      platform: 'wechat',
    })

    expect(html).toContain('☑')
    expect(html).toContain('☐')
    expect(html).not.toContain('<input')
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
