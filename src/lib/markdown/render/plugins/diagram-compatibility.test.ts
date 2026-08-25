import { describe, expect, it, vi } from 'vitest'
import { infographicPaletteIds, infographicThemeIds } from '@/themes/infographic-theme'
import { markdownStyleIds, resolveDiagramFontFamily } from '@/themes/markdown-style/metadata'
import { mermaidThemeIds } from '@/themes/mermaid-theme'
import { render } from '../html'

function fenced(language: 'mermaid' | 'infographic', code: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\``
}

function expectDiagram(html: string, type: 'mermaid' | 'infographic', text: string): void {
  expect(html).toContain(`class="figure-${type}"`)
  expect(html).toContain('<svg')
  expect(html).toContain('</svg>')
  // 关键标签必须出现在可见文本载体中：mermaid 为 <text>，infographic 为 foreignObject 内的 span
  expect(html).toMatch(new RegExp(`(xhtml">[^<]*|<text[^>]*>)\\s*${text}`))
  expect(html).not.toContain(`figure-${type}-error`)
  expect(html).not.toContain('NaN')
  expect(html).toMatch(/style="[^"]*width:100%;max-width:(?:100%|\d+(?:\.\d+)?px);height:auto;display:block;margin:0 auto;/)
}

describe('mermaid compatibility matrix', () => {
  it.each(mermaidThemeIds)('renders a flowchart with theme %j', async (theme) => {
    const html = await render({
      markdown: fenced('mermaid', 'flowchart TD\n  Start[开始] --> End[完成]'),
      mermaidTheme: theme,
    })

    expectDiagram(html, 'mermaid', '开始')
  })

  it.each([
    ['flowchart TD', '', 'flowchart TD\n  A[开始] --> B[校验]\n  B --> C{通过?}\n  C -->|是| D[完成]\n  C -->|否| E[重试]', '通过?'],
    ['flowchart LR', '', 'flowchart LR\n  Alpha --> Beta --> Gamma', 'Gamma'],
    ['state', 'zinc-dark', 'stateDiagram-v2\n  [*] --> 空闲\n  空闲 --> 处理中: 接收任务\n  处理中 --> 完成: 执行成功\n  处理中 --> 空闲: 执行失败\n  完成 --> [*]', '接收任务'],
    ['sequence', 'tokyo-night', 'sequenceDiagram\n  用户->>服务: 提交请求\n  服务->>数据库: 查询记录\n  数据库-->>服务: 返回结果\n  服务-->>用户: 响应数据', '提交请求'],
    ['class', '', 'classDiagram\n  Animal <|-- Dog\n  Animal <|-- Cat\n  Animal : +String name\n  Dog : +fetch()\n  Cat : +purr()', 'Animal'],
    ['ER', 'zinc-dark', 'erDiagram\n  CUSTOMER {\n    string id PK\n    string name\n  }\n  ORDER {\n    string id PK\n    date placed_at\n  }\n  CUSTOMER ||--o{ ORDER : places', 'CUSTOMER'],
    ['XY', 'tokyo-night', 'xychart-beta\n  x-axis [Jan, Feb, Mar]\n  y-axis "Revenue" 0 --> 100\n  bar [30, 60, 45]', 'Revenue'],
  ] as const)('renders %s through the Markdown pipeline', async (_type, theme, syntax, text) => {
    const html = await render({ markdown: fenced('mermaid', syntax), mermaidTheme: theme })

    expectDiagram(html, 'mermaid', text)
    // 实体属性齐全时不得出现库的英文占位符
    if (_type === 'ER') {
      expect(html).not.toContain('(no attributes)')
      // ER 字段名渲染在 <tspan> 中（mono 属性行），实体名在 <text> 中
      expect(html).toContain('placed_at')
      expect(html).toMatch(/<text[^>]*>[^<]*CUSTOMER/)
    }
    else {
      // 关键标签必须是渲染的 <text>，而不是 <title> 提示
      expect(html).toMatch(new RegExp(`<text[^>]*>[^<]*${text}`))
    }
  })
})

const listSyntax = `infographic list-row-simple-horizontal-arrow
data
  lists
    - label 第一步
      desc 开始
    - label 第二步
      desc 完成`

describe('infographic compatibility matrix', () => {
  it.each(infographicThemeIds.flatMap(theme => infographicPaletteIds.map(palette => [theme, palette] as const)))(
    'renders list template with %s theme and %s palette',
    async (theme, palette) => {
      const html = await render({
        markdown: fenced('infographic', listSyntax),
        infographicTheme: theme,
        infographicPalette: palette,
      })

      expectDiagram(html, 'infographic', '第一步')
    },
    10_000,
  )

  it.each([
    ['list', listSyntax, '第一步'],
    ['sequence', `infographic sequence-steps-simple
data
  title 项目节奏
  sequences
    - label 规划
      desc 需求澄清
    - label 设计
      desc 方案评审
    - label 发布
      desc 灰度上线`, '需求澄清'],
    ['compare', `infographic compare-binary-horizontal-simple-vs
data
  items
    - label 方案甲
      children
        - label 稳定
    - label 方案乙
      children
        - label 灵活`, '稳定'],
    ['hierarchy', `infographic hierarchy-structure
data
  root
    label 平台部
    children
      - label 研发组
      - label 产品组`, '研发组'],
    ['relation', `infographic relation-network-icon-badge
data
  nodes
    - id start
      label 开始
    - id end
      label 结束
  relations
    - from start
      to end`, '结束'],
    ['chart', `infographic chart-pie-plain-text
data
  values
    - label 产品甲
      value 60
    - label 产品乙
      value 40`, '产品甲'],
  ] as const)('renders stable %s category through SSR and the plugin', async (_category, syntax, text) => {
    const html = await render({ markdown: fenced('infographic', syntax) })

    expectDiagram(html, 'infographic', text)
    // 关键标签必须在 span 可见文本中；circle-node 类模板把 label 藏进 <title>，属于视觉假阳性
    expect(html).toMatch(new RegExp(`xhtml">[^<]*${text}`))
    expect(html).not.toMatch(new RegExp(`<title>\\s*${text}\\s*</title>`))
  }, 10_000)
})

describe('diagram font follows markdown style', () => {
  const mermaidSyntax = 'flowchart TD\n  A[开始] --> B[结束]'
  const infographicSyntax = listSyntax

  it.each(markdownStyleIds)('%s 风格下 Mermaid 携带 serif/sans-serif 字体族，Inter 不再控制输出', async (styleId) => {
    const expectedFamily = resolveDiagramFontFamily(styleId)
    const html = await render({
      markdown: fenced('mermaid', mermaidSyntax),
      markdownStyle: styleId,
    })

    expectDiagram(html, 'mermaid', '开始')
    // 字体族写入 SVG 内部 <style> 的 text 规则（juice 不会抽走 SVG 命名空间内的样式）
    expect(html).toContain(`text { font-family: ${expectedFamily};`)
    expect(html).not.toContain('\'Inter\'')
  }, 10_000)

  it.each(markdownStyleIds)('%s 风格下 Infographic 根节点携带 serif/sans-serif 字体族，PuHuiTi 不再控制输出', async (styleId) => {
    const expectedFamily = resolveDiagramFontFamily(styleId)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const html = await render({
        markdown: fenced('infographic', infographicSyntax),
        markdownStyle: styleId,
      })

      expectDiagram(html, 'infographic', '第一步')
      expect(html).toContain(`font-family="${expectedFamily}"`)
      expect(html).not.toContain('Alibaba PuHuiTi')
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Font family "(?:serif|sans-serif)" not registered/)
    }
    finally {
      warn.mockRestore()
    }
  }, 10_000)

  it('未知排版风格按 Kami 回退到 serif', async () => {
    const html = await render({
      markdown: fenced('mermaid', mermaidSyntax),
      // @ts-expect-error 故意传入未注册的 style id，验证运行时回退
      markdownStyle: 'not-a-style',
    })

    expect(html).toContain('text { font-family: serif;')
  })
})
