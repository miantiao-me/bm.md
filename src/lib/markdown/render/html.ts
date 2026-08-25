import type { Plugin } from 'unified'
import type * as z from 'zod'
import type { renderDefinition } from './definition'
import juice from 'juice'
import katexCss from 'katex/dist/katex.css?inline'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeGithubAlert from 'rehype-github-alert'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { loadCodeThemeCss } from '@/themes/code-theme/loader'
import { loadMarkdownStyleCss } from '@/themes/markdown-style/loader'
import { resolveDiagramFontFamily } from '@/themes/markdown-style/metadata'
import { getAdapterPlugins } from './adapters'
import rehypeDivToSection from './plugins/rehype-div-to-section'
import rehypeFigureWrapper from './plugins/rehype-figure-wrapper'
import rehypeFootnoteLinks from './plugins/rehype-footnote-links'
import rehypeInfographic from './plugins/rehype-infographic'
import rehypeKatexMetadata from './plugins/rehype-katex-metadata'
import rehypeMermaid from './plugins/rehype-mermaid'
import rehypeWrapTextNodes from './plugins/rehype-wrap-text-nodes'
import remarkFrontmatterTable from './plugins/remark-frontmatter-table'
import { sanitizeSchema } from './sanitize-schema'

export type RenderOptions = z.input<typeof renderDefinition.inputSchema>

export interface PreviewRenderResult {
  html: string
  css: string
}

type ProcessorOptions = Pick<RenderOptions, 'enableFootnoteLinks' | 'openLinksInNewWindow' | 'mermaidTheme' | 'infographicTheme' | 'infographicPalette' | 'markdownStyle' | 'platform' | 'footnoteLabel' | 'referenceTitle'>

function createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, infographicTheme, infographicPalette, markdownStyle, platform = 'html', footnoteLabel = 'Footnotes', referenceTitle = 'References' }: ProcessorOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkFrontmatterTable)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel,
      footnoteLabelTagName: 'h4',
    })

  if (openLinksInNewWindow) {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noreferrer', 'noopener'],
    })
  }

  processor
    .use(rehypeRaw)
    .use(rehypeGithubAlert)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeMermaid, { theme: mermaidTheme, fontFamily: resolveDiagramFontFamily(markdownStyle) })
    .use(rehypeInfographic, { theme: infographicTheme, palette: infographicPalette, fontFamily: resolveDiagramFontFamily(markdownStyle) })
    .use(rehypeKatex, {
      output: 'htmlAndMathml',
      trust: false,
      maxSize: 500,
      maxExpand: 1000,
    })
    .use(rehypeKatexMetadata)
    .use(rehypeHighlight)
    .use(rehypeFigureWrapper)

  if (enableFootnoteLinks && platform !== 'wechat') {
    processor.use(rehypeFootnoteLinks, { referenceTitle })
  }

  const adapterPlugins = getAdapterPlugins(platform, { referenceTitle })
  for (const plugin of adapterPlugins) {
    if (Array.isArray(plugin)) {
      processor.use(plugin[0] as Plugin, plugin[1])
    }
    else {
      processor.use(plugin as Plugin)
    }
  }

  processor.use(rehypeDivToSection)
  processor.use(rehypeWrapTextNodes)

  processor.use(rehypeStringify, { allowDangerousHtml: true })

  return processor
}

export async function render(options: RenderOptions): Promise<string> {
  const html = await renderMarkdownHtml(options)
  const css = collectRenderCss(options, html)

  if (!css) {
    return html
  }

  const wrapped = `<section id="bm-md">${html}</section>`

  try {
    return juice.inlineContent(wrapped, css, {
      inlinePseudoElements: true,
      preserveImportant: true,
    })
  }
  catch (error) {
    console.error('Juice inline error:', error)
    return wrapped
  }
}

export async function renderPreview(options: RenderOptions): Promise<PreviewRenderResult> {
  const html = await renderMarkdownHtml(options)

  return {
    html,
    css: collectRenderCss(options, html),
  }
}

export async function renderMarkdownHtml(options: RenderOptions): Promise<string> {
  const {
    markdown,
    markdownStyle,
    mermaidTheme,
    infographicTheme,
    infographicPalette,
    enableFootnoteLinks = true,
    openLinksInNewWindow = true,
    platform = 'html',
    footnoteLabel = 'Footnotes',
    referenceTitle = 'References',
  } = options

  const processor = createProcessor({ enableFootnoteLinks, openLinksInNewWindow, mermaidTheme, infographicTheme, infographicPalette, markdownStyle, platform, footnoteLabel, referenceTitle })

  return (await processor.process(markdown)).toString()
}

export function collectRenderCss(options: RenderOptions, html: string): string {
  const {
    markdownStyle,
    codeTheme,
    customCss = '',
  } = options

  const hasKatex = html.includes('class="katex"')
    || html.includes('class="katex-display"')
    || html.includes('class="katex-mathml"')

  if (!markdownStyle && !codeTheme && !hasKatex && !customCss) {
    return ''
  }

  const markdownStyleCss = markdownStyle ? loadMarkdownStyleCss(markdownStyle) : ''
  const codeThemeCss = codeTheme ? loadCodeThemeCss(codeTheme) : ''
  const mathCss = hasKatex ? katexCss : ''
  return [
    markdownStyleCss ?? '',
    codeThemeCss ?? '',
    mathCss,
    customCss,
  ].filter(Boolean).join('\n')
}
