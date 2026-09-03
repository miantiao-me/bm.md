import type { Plugin } from 'unified'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'
import { render, renderPreview } from './html'
import remarkHighlight from './plugins/remark-highlight'

interface InvalidImageCase {
  input: string
  alt: string
}

describe('obsidian 图片尺寸', () => {
  it('渲染单宽图片并从替代文本和题注中剥离尺寸', async () => {
    const { html } = await renderPreview({ markdown: '![说明|320](/image.png)' })

    expect(html).toContain('<img src="/image.png" alt="说明" width="320">')
    expect(html).toMatch(/<figcaption><span>说明<\/span><\/figcaption>/)
  })

  it('渲染宽高图片且不改变标题和 URL', async () => {
    const { html } = await renderPreview({ markdown: '![说明|320x180](/image.png?size=raw "标题")' })

    expect(html).toContain('<img src="/image.png?size=raw" alt="说明" title="标题" width="320" height="180">')
    expect(html).toMatch(/<figcaption><span>说明<\/span><\/figcaption>/)
  })

  it.each<InvalidImageCase>([
    { input: '![说明|0](/image.png)', alt: '说明|0' },
    { input: '![说明|-1](/image.png)', alt: '说明|-1' },
    { input: '![说明|320px](/image.png)', alt: '说明|320px' },
    { input: '![说明|320x](/image.png)', alt: '说明|320x' },
    { input: '![说明|x180](/image.png)', alt: '说明|x180' },
    { input: '![说明|320x0](/image.png)', alt: '说明|320x0' },
    { input: '![说明|320X180](/image.png)', alt: '说明|320X180' },
  ])('不解析无效图片尺寸：$input', async ({ input, alt }) => {
    const { html } = await renderPreview({ markdown: input })

    expect(html).toContain(`alt="${alt}"`)
    expect(html).not.toMatch(/<img[^>]+(?:width|height)=/)
  })

  it('保持普通图片行为', async () => {
    const { html } = await renderPreview({ markdown: '![普通说明](/image.png)' })

    expect(html).toContain('<img src="/image.png" alt="普通说明">')
    expect(html).toMatch(/<figcaption><span>普通说明<\/span><\/figcaption>/)
    expect(html).not.toMatch(/<img[^>]+(?:width|height)=/)
  })

  it('最终内联样式不覆盖显式图片高度', async () => {
    const html = await render({
      markdown: '![说明|320x180](/image.png)',
      markdownStyle: 'kami',
    })
    const image = html.match(/<img[^>]*>/)?.[0] ?? ''

    expect(image).toContain('width="320"')
    expect(image).toContain('height="180"')
    expect(image).not.toMatch(/style="[^"]*height:\s*auto/)
  })
})

describe('obsidian 高亮', () => {
  it('渲染普通、粗体和斜体高亮', async () => {
    const { html } = await renderPreview({ markdown: '==高亮文本== ==**粗体**== ==*斜体*==' })

    expect(html).toContain('<mark>高亮文本</mark>')
    expect(html).toContain('<mark><strong>粗体</strong></mark>')
    expect(html).toContain('<mark><em>斜体</em></mark>')
  })

  it('支持与 GFM 删除线双向嵌套', async () => {
    const { html } = await renderPreview({ markdown: '==~~删除~~== ~~==高亮==~~' })

    expect(html).toContain('<mark><del>删除</del></mark>')
    expect(html).toContain('<del><mark>高亮</mark></del>')
  })

  it('按 Markdown flanking 处理 Unicode 空白和标点', async () => {
    const { html } = await renderPreview({ markdown: '（==高亮==）\n\n==　不高亮==\n\n==标点。==' })

    expect(html).toContain('<span>（</span><mark>高亮</mark><span>）</span>')
    expect(html).toContain('==　不高亮==')
    expect(html).toContain('<mark>标点。</mark>')
  })

  it('不解析转义、代码、未闭合及非双等号边界', async () => {
    const markdown = '\\==转义== ==结束\\== `==代码==` ==未闭合 =单个= ===三个==='
    const { html } = await renderPreview({ markdown })

    expect(html).toContain('==转义==')
    expect(html).toContain('==结束==')
    expect(html).toContain('<code>==代码==</code>')
    expect(html).toContain('==未闭合')
    expect(html).toContain('=单个=')
    expect(html).toContain('===三个===')
    expect(html).not.toContain('<mark>')
  })

  it('处理事件密集的长输入且不触发参数数量上限', async () => {
    let maxInsideSpanEvents = 0
    const recordInsideSpanEvents: Plugin = function () {
      const data = this.data()
      const extensions = data.micromarkExtensions || (data.micromarkExtensions = [])
      extensions.push({
        insideSpan: {
          null: [{
            resolveAll(events) {
              maxInsideSpanEvents = Math.max(maxInsideSpanEvents, events.length)
              return events
            },
          }],
        },
      })
    }
    const processor = unified()
      .use(remarkParse)
      .use(remarkHighlight)
      .use(recordInsideSpanEvents)
    const markdown = `==${'**内容**'.repeat(16_000)}==`

    expect(() => processor.parse(markdown)).not.toThrow()
    expect(maxInsideSpanEvents).toBeGreaterThan(125_000)
  }, 10_000)

  it('让 mark 经过 sanitize 且不放行事件属性', async () => {
    const { html } = await renderPreview({ markdown: '<mark onclick="alert(1)">原生标记</mark>' })

    expect(html).toContain('<mark>原生标记</mark>')
    expect(html).not.toContain('onclick')
  })
})
