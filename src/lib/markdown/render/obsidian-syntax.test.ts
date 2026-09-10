import type { Plugin } from 'unified'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { assert, describe, expect, it } from 'vitest'
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
  describe.each([
    ['前文', '高亮文本', '后文'],
    ['before', 'highlighted text', 'after'],
  ])('正文贴邻高亮：%s / %s / %s', (before, text, after) => {
    it.each([
      ['**', 'strong'],
      ['__', 'strong'],
      ['*', 'em'],
      ['_', 'em'],
      ['~~', 'del'],
    ])('支持 %s 双向包裹并保留外层下划线的词内限制', async (delimiter, tag) => {
      for (const [prefix, suffix] of [[before, ''], ['', after], [before, after]]) {
        const leading = prefix ? `<span>${prefix}</span>` : ''
        const trailing = suffix ? `<span>${suffix}</span>` : ''
        const inner = await renderPreview({ markdown: `${prefix}==${delimiter}${text}${delimiter}==${suffix}` })
        expect(inner.html).toBe(`<p>${leading}<mark><${tag}>${text}</${tag}></mark>${trailing}</p>`)

        const outer = await renderPreview({ markdown: `${prefix}${delimiter}==${text}==${delimiter}${suffix}` })
        const expected = delimiter.startsWith('_')
          ? `<span>${prefix}${delimiter}</span><mark>${text}</mark><span>${delimiter}${suffix}</span>`
          : `${leading}<${tag}><mark>${text}</mark></${tag}>${trailing}`
        expect(outer.html).toBe(`<p>${expected}</p>`)
      }
    })
  })

  it.each([
    ['前文==**未配对==后文', '<span>前文</span><mark>**未配对</mark><span>后文</span>'],
    ['前文==未配对**==后文', '<span>前文</span><mark>未配对**</mark><span>后文</span>'],
    ['前文==** 空白**==后文', '<span>前文</span><mark>** 空白**</mark><span>后文</span>'],
    ['前文==**空白 **==后文', '<span>前文</span><mark>**空白 **</mark><span>后文</span>'],
    ['前文==**文本**==。', '<span>前文</span><mark><strong>文本</strong></mark><span>。</span>'],
    ['（==**文本**==后文', '<span>（</span><mark><strong>文本</strong></mark><span>后文</span>'],
  ])('贴邻格式边界不要求内层格式配对：%s', async (markdown, content) => {
    expect((await renderPreview({ markdown })).html).toBe(`<p>${content}</p>`)
  })

  it.each([
    '前文\\==**文本**==后文',
    '前文==**文本**\\==后文',
    '前文==\\*文本\\*==后文',
    '前文==文本\\*==后文',
    '前文==文本\\_==后文',
    '前文==文本\\~==后文',
    '前文== **文本**==后文',
    '前文==**文本**　==后文',
    '前文===**文本**===后文',
    '前文====**文本**====后文',
    '前文==[文本==](url)后文',
    '前文[==文本](url)==后文',
    '前文==**[文本==](url)后文',
    '前文==!文本!==后文',
  ])('不放宽转义、空白、连续等号、label 和非格式标点：%s', (markdown) => {
    const baseline = unified().use(remarkParse).use(remarkGfm)
    const processor = unified().use(remarkParse).use(remarkHighlight).use(remarkGfm)
    expect(processor.parse(markdown)).toEqual(baseline.parse(markdown))
  })

  it('不因登记了非格式 attention marker 就放宽正文贴邻', () => {
    const registerNonFormatMarker: Plugin = function () {
      const data = this.data()
      const extensions = data.micromarkExtensions || (data.micromarkExtensions = [])
      extensions.push({ attentionMarkers: { null: [35] } })
    }
    const markdown = '前文==#文本#==后文'
    const baseline = unified().use(remarkParse).use(remarkGfm).use(registerNonFormatMarker)
    const processor = unified().use(remarkParse).use(remarkHighlight).use(remarkGfm).use(registerNonFormatMarker)
    expect(processor.parse(markdown)).toEqual(baseline.parse(markdown))
  })

  it.each([false, true])('独立解析及链接 label 边界，GFM：%s', (gfm) => {
    const processor = unified().use(remarkParse).use(remarkHighlight)
    const baseline = unified().use(remarkParse)
    if (gfm) {
      processor.use(remarkGfm)
      baseline.use(remarkGfm)
    }
    expect(processor.parse('==_文本_==').children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'highlight', children: [{ type: 'emphasis' }] }],
    })
    expect(processor.parse('==[文本](url)==').children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'highlight', children: [{ type: 'link', url: 'url' }] }],
    })
    expect(processor.parse('[==文本==](url)').children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'link', children: [{ type: 'highlight' }] }],
    })
    expect(processor.parse('==![文本](url)==').children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'highlight', children: [{ type: 'image', alt: '文本' }] }],
    })
    expect(processor.parse('![==文本==](url)').children[0]).toMatchObject({
      type: 'paragraph',
      children: [{ type: 'image', alt: '文本' }],
    })
    for (const markdown of [
      '==[文本==](url)',
      '[==文本](url)==',
      '==![文本==](url)',
      '![==文本](url)==',
      '==[未闭合==',
      '==![未闭合==',
      '[前文](url) ==[未闭合==',
      '[前文] ==[未闭合==',
      '![前文](url) ==[未闭合==',
      '[前文] ==![未闭合==',
    ]) {
      expect(processor.parse(markdown)).toEqual(baseline.parse(markdown))
    }
  })

  it('无高亮 GFM 行为不变，连续解析和无关段落不泄漏状态', () => {
    const baseline = unified().use(remarkParse).use(remarkGfm)
    const processor = unified().use(remarkParse).use(remarkHighlight).use(remarkGfm)
    const plain = ['~~_文本_~~', '_foo_bar_', '__foo__bar', '~~a~b~~', '~单删除~', '[__链接__](url)', '![图片](url)', '_ 空白_', 'foo_bar_baz'].join('\n\n')
    for (let index = 0; index < 3; index++) {
      processor.parse('==~~_文本_~~==\n\n~~__==文本==__~~')
      expect(processor.parse(plain)).toEqual(baseline.parse(plain))
    }
    const tree = processor.parse(`==_高亮_==\n\n${plain}`)
    const control = baseline.parse(`==_高亮_==\n\n${plain}`)
    expect(tree.children.slice(1)).toEqual(control.children.slice(1))
  })

  it('同一段落内高亮后的普通 GFM 内容恢复原有行为', () => {
    const markdown = '==_高亮_== ~~_普通_~~'
    const baseline = unified().use(remarkParse).use(remarkGfm)
    const processor = unified().use(remarkParse).use(remarkHighlight).use(remarkGfm)
    const paragraph = processor.parse(markdown).children[0]
    const control = baseline.parse(markdown).children[0]

    assert(paragraph.type === 'paragraph' && control.type === 'paragraph')
    expect(paragraph.children[0]).toMatchObject({ type: 'highlight', children: [{ type: 'emphasis' }] })
    expect(paragraph.children.at(-1)).toMatchObject({ type: 'delete' })
    expect(paragraph.children.at(-1)).toEqual(control.children.at(-1))
  })

  describe.each(['中文文本', 'English text'])('双向嵌套：%s', (text) => {
    const formats = [['==', 'mark'], ['**', 'strong'], ['__', 'strong'], ['*', 'em'], ['_', 'em'], ['~~', 'del']]
    const triples = formats.flatMap(outer => formats.flatMap(middle => formats
      .filter(inner => new Set([outer[0], middle[0], inner[0]]).size === 3 && [outer, middle, inner].some(format => format[0] === '==') && [outer, middle, inner].some(format => format[0] === '~~'))
      .map(inner => [outer, middle, inner])))

    it.each(triples)('支持三层排列 %j / %j / %j', async (outer, middle, inner) => {
      const { html } = await renderPreview({ markdown: `${outer[0]}${middle[0]}${inner[0]}${text}${inner[0]}${middle[0]}${outer[0]}` })

      expect(html).toBe(`<p><${outer[1]}><${middle[1]}><${inner[1]}>${text}</${inner[1]}></${middle[1]}></${outer[1]}></p>`)
    })

    it.each([
      ['**', 'strong'],
      ['__', 'strong'],
      ['*', 'em'],
      ['_', 'em'],
      ['~~', 'del'],
    ])('支持 %s 与高亮两种包裹方向', async (delimiter, tag) => {
      const { html } = await renderPreview({ markdown: `==${delimiter}${text}${delimiter}==\n\n${delimiter}==${text}==${delimiter}` })

      expect(html).toBe(`<p><mark><${tag}>${text}</${tag}></mark></p>\n<p><${tag}><mark>${text}</mark></${tag}></p>`)
    })

    it('支持原生 ins 下划线双向及多重嵌套', async () => {
      const { html } = await renderPreview({ markdown: `==<ins>${text}</ins>==\n\n<ins>==${text}==</ins>\n\n**==<ins>*${text}*</ins>==**` })

      expect(html).toBe(`<p><mark><ins>${text}</ins></mark></p>\n<p><ins><mark>${text}</mark></ins></p>\n<p><strong><mark><ins><em>${text}</em></ins></mark></strong></p>`)
    })

    it.each([
      ['==**~~*', '*~~**==', '<mark><strong><del><em>', '</em></del></strong></mark>'],
      ['~~*==**', '**==*~~', '<del><em><mark><strong>', '</strong></mark></em></del>'],
      ['__==*', '*==__', '<strong><mark><em>', '</em></mark></strong>'],
    ])('支持多重嵌套 %s', async (open, close, htmlOpen, htmlClose) => {
      const { html } = await renderPreview({ markdown: `${open}${text}${close}` })

      expect(html).toBe(`<p>${htmlOpen}${text}${htmlClose}</p>`)
    })
  })

  it.each([
    ['_before ==a_== after_', '<em>before <mark>a_</mark> after</em>'],
    ['__before ==a__== after__', '<strong>before <mark>a__</mark> after</strong>'],
    ['_before ==_a== after_', '<em>before <mark>_a</mark> after</em>'],
    ['__before ==__a== after__', '<strong>before <mark>__a</mark> after</strong>'],
    ['==`**代码**`==', '<mark><code>**代码**</code></mark>'],
    ['**`==code==`**', '<strong><code>==code==</code></strong>'],
    ['==\\*斜体\\*==', '<mark>*斜体*</mark>'],
    ['**\\==text==**', '<strong>==text==</strong>'],
    ['==**未闭合**', '<span>==</span><strong>未闭合</strong>'],
    ['**==未闭合**', '<strong>==未闭合</strong>'],
    ['==**未闭合==', '<mark>**未闭合</mark>'],
    ['== **空白**==', '<span>== </span><strong>空白</strong><span>==</span>'],
    ['==**空白** ==', '<span>==</span><strong>空白</strong><span> ==</span>'],
    ['**== ==**', '<strong>== ==</strong>'],
    ['==_ 空白_==', '<mark>_ 空白_</mark>'],
    ['==_空白 _==', '<mark>_空白 _</mark>'],
    ['==__　空白__==', '<mark>__　空白__</mark>'],
    ['==__空白　__==', '<mark>__空白　__</mark>'],
    ['==_中文\nEnglish_==', '<mark><em>中文\nEnglish</em></mark>'],
    ['==_😀_==', '<mark><em>😀</em></mark>'],
    ['_==😀==_', '<em><mark>😀</mark></em>'],
    ['==😀_文本_😀==', '<mark>😀_文本_😀</mark>'],
    ['==_foo_bar==', '<mark>_foo_bar</mark>'],
    ['==foo_bar_==', '<mark>foo_bar_</mark>'],
    ['====', '<span>====</span>'],
    ['==foo_bar_baz==', '<mark>foo_bar_baz</mark>'],
    ['==中文_斜体_后文==', '<mark>中文_斜体_后文</mark>'],
    ['==foo__bar__baz==', '<mark>foo__bar__baz</mark>'],
    ['==中文__粗体__后文==', '<mark>中文__粗体__后文</mark>'],
    ['==foo*bar*baz==', '<mark>foo<em>bar</em>baz</mark>'],
    ['==++下划线++==', '<mark>++下划线++</mark>'],
    ['==<u>下划线</u>==', '<mark>下划线</mark>'],
    ['前文==+文本+==后文', '<span>前文</span><mark>+文本+</mark><span>后文</span>'],
    ['前文==`文本`==后文', '<span>前文</span><mark><code>文本</code></mark><span>后文</span>'],
  ])('保留边界契约：%s', async (markdown, content) => {
    const { html } = await renderPreview({ markdown })

    expect(html).toBe(`<p>${content}</p>`)
  })

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
    const markdown = `==${Array.from({ length: 16_000 }).fill('**内容**').join(' ')}==`

    expect(() => processor.parse(markdown)).not.toThrow()
    expect(maxInsideSpanEvents).toBeGreaterThan(125_000)
  }, 10_000)

  it('让 mark 经过 sanitize 且不放行事件属性', async () => {
    const { html } = await renderPreview({ markdown: '<mark onclick="alert(1)">原生标记</mark>' })

    expect(html).toContain('<mark>原生标记</mark>')
    expect(html).not.toContain('onclick')
  })
})
