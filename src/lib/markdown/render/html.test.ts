import { describe, expect, it } from 'vitest'
import { render, renderPreview } from './html'

function getFirstTag(html: string, tagName: string): string {
  return html.match(new RegExp(`<${tagName}[^>]*>`))?.[0] ?? ''
}

function getFirstTagContaining(html: string, tagName: string, text: string): string {
  const tags: string[] = html.match(new RegExp(`<${tagName}[^>]*>`, 'g')) ?? []
  return tags.find(tag => tag.includes(text)) ?? ''
}

describe('markdown -> html render (general)', () => {
  it('renders paragraphs as p elements', async () => {
    const html = await render({ markdown: '这是一个段落' })

    expect(html).toContain('<p')
    expect(html).toContain('这是一个段落')
  })

  it('renders headings with correct tags', async () => {
    const html = await render({ markdown: '# 一级标题\n\n## 二级标题' })

    expect(html).toMatch(/<h1[^>]*>.*一级标题.*<\/h1>/)
    expect(html).toMatch(/<h2[^>]*>.*二级标题.*<\/h2>/)
  })

  it('renders GFM tables correctly', async () => {
    const markdown = '| 列A | 列B |\n|-----|-----|\n| 1 | 2 |'
    const html = await render({ markdown })

    expect(html).toContain('<table')
    expect(html).toContain('<th')
    expect(html).toContain('列A')
    expect(html).toContain('列B')
  })

  it('applies code highlighting classes', async () => {
    const markdown = '```javascript\nconst x = 1\n```'
    const html = await render({ markdown })

    expect(html).toContain('<pre')
    expect(html).toContain('<code')
    expect(html).toContain('hljs')
  })

  it('renders inline math with KaTeX', async () => {
    const html = await render({ markdown: '公式 $E=mc^2$ 很有名' })
    const katexTag = getFirstTagContaining(html, 'span', 'class="katex"')

    expect(html).toContain('class="katex"')
    expect(html).toContain('katex-mathml')
    expect(katexTag).toContain('class="katex"')
    expect(katexTag).toContain('data-bm-rich="katex"')
    expect(katexTag).toContain('data-bm-hash="')
  })

  it('renders block math with KaTeX', async () => {
    const html = await render({ markdown: '$$\n\\sum_{i=1}^n i\n$$' })
    const displayTag = getFirstTagContaining(html, 'span', 'class="katex-display"')

    expect(html).toContain('katex-display')
    expect(html).toContain('katex-mathml')
    expect(displayTag).toContain('class="katex-display"')
    expect(displayTag).toContain('data-bm-rich="katex"')
    expect(displayTag).toContain('data-bm-hash="')
  })

  it('renders Mermaid blocks as sanitized rich SVG figures', async () => {
    const markdown = [
      '```mermaid',
      'flowchart TD',
      '  A[开始] --> B[结束]',
      '```',
    ].join('\n')

    const html = await render({ markdown })
    const figureTag = getFirstTag(html, 'figure')
    const svgTag = getFirstTag(html, 'svg')
    const markerTag = getFirstTag(html, 'marker')

    expect(figureTag).toContain('class="figure-mermaid"')
    expect(figureTag).toContain('data-bm-rich="mermaid"')
    expect(figureTag).toContain('data-bm-hash="')
    expect(svgTag).toContain('role="img"')
    expect(svgTag).not.toContain('data-bm-rich')
    expect(svgTag).toContain('width:100%;max-width:151.59px;height:auto;display:block;margin:0 auto;')
    expect(markerTag).toContain('id="bm-mermaid-')
    expect(html).not.toContain('@import')
    expect(html).not.toContain('id="arrowhead"')
  })

  it('injects the default markdown style font family into diagram SVGs', async () => {
    const html = await render({
      markdown: [
        '```mermaid',
        'flowchart TD',
        '  A[开始] --> B[结束]',
        '```',
      ].join('\n'),
    })

    // 默认排版风格为 Kami（衬线类）：图表文字随文档字体族，库默认 Inter 不再控制输出
    expect(html).toContain('text { font-family: serif;')
    expect(html).not.toContain('\'Inter\'')
  })

  it('keeps SVG ids unique for duplicated Mermaid blocks', async () => {
    const block = [
      '```mermaid',
      'flowchart TD',
      '  A --> B',
      '```',
    ].join('\n')
    const html = await render({ markdown: `${block}\n\n${block}` })
    const arrowheadIds = [...html.matchAll(/id="(bm-mermaid-[^"]+-arrowhead)"/g)].map(match => match[1])

    expect(arrowheadIds).toHaveLength(2)
    expect(new Set(arrowheadIds).size).toBe(2)
  })

  it('does not render code blocks whose language only contains mermaid text', async () => {
    const html = await render({ markdown: '```notmermaid\nflowchart TD\n  A --> B\n```' })

    expect(html).not.toContain('figure-mermaid')
    expect(html).toContain('language-notmermaid')
  })

  it('generates footnote references when enabled', async () => {
    const html = await render({
      markdown: '[示例](https://example.com)',
      enableFootnoteLinks: true,
      platform: 'html',
    })

    expect(html).toContain('footnote-ref')
    expect(html).toContain('[1]')
    expect(html).toContain('References')
  })

  it('preserves links without footnotes when disabled', async () => {
    const html = await render({
      markdown: '[示例](https://example.com)',
      enableFootnoteLinks: false,
    })

    expect(html).toContain('href="https://example.com"')
    expect(html).not.toContain('footnote-ref')
  })

  it('reuses footnote id for duplicate links', async () => {
    const html = await render({
      markdown: '[链接1](https://example.com) 和 [链接2](https://example.com)',
      enableFootnoteLinks: true,
      platform: 'html',
    })

    const matches = html.match(/\[1\]/g)
    expect(matches?.length).toBe(2)
    expect(html).not.toContain('[2]')
  })

  it('does not create external-link footnotes for mailto and tel links', async () => {
    const html = await render({
      markdown: '[邮件](mailto:test@example.com) [电话](tel:123)',
      enableFootnoteLinks: true,
      platform: 'html',
    })

    expect(html).toContain('href="mailto:test@example.com"')
    expect(html).toContain('href="tel:123"')
    expect(html).not.toContain('footnote-ref')
    expect(html).not.toContain('References')
  })

  it('adds target blank when openLinksInNewWindow is true', async () => {
    const html = await render({
      markdown: '[外链](https://example.com)',
      openLinksInNewWindow: true,
      enableFootnoteLinks: false,
    })

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
  })

  it('converts YAML frontmatter to table', async () => {
    const markdown = '---\ntitle: 测试标题\nauthor: 作者\n---\n\n正文内容'
    const html = await render({ markdown })

    expect(html).toContain('<table')
    expect(html).toContain('title')
    expect(html).toContain('测试标题')
    expect(html).toContain('author')
  })

  it('handles empty input', async () => {
    const html = await render({ markdown: '' })

    expect(html).toBeDefined()
  })

  it('renders GitHub alerts', async () => {
    const markdown = '> [!NOTE]\n> 这是一个提示'
    const html = await render({ markdown })

    expect(html).toContain('markdown-alert')
  })

  it('converts div to section for platform compatibility', async () => {
    const markdown = '> [!NOTE]\n> 这是一个提示'
    const html = await render({ markdown })

    expect(html).toContain('<section')
    expect(html).toContain('class="markdown-alert')
    expect(html).not.toMatch(/<div[^>]*class="markdown-alert/)
  })

  it('wraps text nodes with span when mixed with inline elements', async () => {
    const html = await render({ markdown: '**Markdown 渲染**：将 Markdown 转换为 HTML' })

    expect(html).toContain('<strong')
    expect(html).toContain('Markdown 渲染')
    expect(html).toMatch(/<span[^>]*>：将 Markdown 转换为 HTML<\/span>/)
  })

  it('wraps text in pure text paragraph', async () => {
    const html = await render({ markdown: '纯文本段落' })

    expect(html).toContain('<p')
    expect(html).toMatch(/<p[^>]*><span[^>]*>纯文本段落<\/span><\/p>/)
  })

  it('wraps text in pure text list item', async () => {
    const html = await render({ markdown: '- 语法高亮与更好的代码评审体验' })

    expect(html).toContain('<li')
    expect(html).toMatch(/<li[^>]*><span[^>]*>语法高亮与更好的代码评审体验<\/span><\/li>/)
  })

  it('wraps text in list items with mixed content', async () => {
    const html = await render({ markdown: '- **功能**：这是说明文字' })

    expect(html).toContain('<li')
    expect(html).toContain('<strong')
    expect(html).toMatch(/<span[^>]*>：这是说明文字<\/span>/)
  })

  it('does not wrap text inside nested inline elements', async () => {
    const html = await render({ markdown: '*斜体**粗体**后续*' })

    expect(html).toContain('<em')
    expect(html).toContain('<strong')
    expect(html).not.toMatch(/<em[^>]*><span/)
  })

  it('wraps text even when br element is present', async () => {
    const html = await render({ markdown: '第一行  \n第二行' })

    expect(html).toContain('<br')
    expect(html).toMatch(/<span[^>]*>第一行<\/span>/)
    expect(html).toMatch(/<span[^>]*>\s*第二行<\/span>/)
  })
})

describe('markdown preview rendering', () => {
  it('returns body HTML and CSS without inlining preview styles', async () => {
    const preview = await renderPreview({
      markdown: '## 标题\n\n```js\nconst x = 1\n```',
      markdownStyle: 'blueprint',
      codeTheme: 'catppuccin-latte',
      customCss: '#bm-md h2 { color: red; }',
    })

    expect(preview.html).toContain('<h2')
    expect(preview.html).toContain('<pre')
    expect(preview.html).not.toContain('<section id="bm-md">')
    expect(preview.html).not.toContain('style="')
    expect(preview.css).toContain('#bm-md')
    expect(preview.css).toContain('color: red')
  })

  it('keeps public render output inline styled for export and copy', async () => {
    const html = await render({
      markdown: '## 标题\n\n```js\nconst x = 1\n```',
      markdownStyle: 'blueprint',
      codeTheme: 'catppuccin-latte',
      customCss: '#bm-md h2 { color: red; }',
    })

    expect(html).toContain('<section id="bm-md"')
    expect(html).toContain('style="')
  })
})

describe('i18n support', () => {
  it('uses custom referenceTitle in footnotes section', async () => {
    const html = await render({
      markdown: '[链接](https://example.com)',
      enableFootnoteLinks: true,
      platform: 'html',
      referenceTitle: '参考链接',
    })

    expect(html).toContain('参考链接')
    expect(html).not.toContain('References')
  })

  it('uses custom referenceTitle for wechat platform', async () => {
    const html = await render({
      markdown: '[链接](https://example.com)',
      platform: 'wechat',
      referenceTitle: '参考链接',
    })

    expect(html).toContain('参考链接')
    expect(html).not.toContain('References')
  })

  it('uses custom footnoteLabel for GFM footnotes', async () => {
    const html = await render({
      markdown: '文本[^1]\n\n[^1]: 脚注内容',
      footnoteLabel: '脚注',
    })

    expect(html).toContain('脚注')
    expect(html).not.toContain('Footnotes')
  })
})
