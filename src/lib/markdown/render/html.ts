import type { Platform } from './adapters'
import juice from 'juice'
import katexCss from 'katex/dist/katex.css?raw'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeGithubAlert from 'rehype-github-alert'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { getCodeThemeById } from '@/themes/code-theme'
import { getMarkdownStyleById } from '@/themes/markdown-style'
import { getAdapterPlugins } from './adapters'
import { rehypeFigureWrapper, rehypeFootnoteLinks, remarkFrontmatterTable } from './plugins'

export interface RenderOptions {
  markdown: string
  markdownStyle?: string
  codeTheme?: string
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
}

interface ProcessorOptions {
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
}

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', 'tel'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg',
    'path',
    'figcaption',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    p: [...(defaultSchema.attributes?.p || []), 'className'],
    svg: ['className', 'viewBox', 'version', 'width', 'height', 'ariaHidden'],
    path: ['d'],
  },
}

function createProcessor({ enableFootnoteLinks, openLinksInNewWindow, platform = 'html' }: ProcessorOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkFrontmatterTable)
    .use(remarkRehype, { allowDangerousHtml: true })

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
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeFigureWrapper)

  if (enableFootnoteLinks && platform !== 'wechat') {
    processor.use(rehypeFootnoteLinks)
  }

  const adapterPlugins = getAdapterPlugins(platform)
  for (const plugin of adapterPlugins) {
    processor.use(plugin)
  }

  processor.use(rehypeStringify, { allowDangerousHtml: true })

  return processor
}

export default async function render(options: RenderOptions): Promise<string> {
  const {
    markdown,
    markdownStyle,
    codeTheme,
    enableFootnoteLinks = true,
    openLinksInNewWindow = true,
    platform = 'html',
  } = options

  const processor = createProcessor({ enableFootnoteLinks, openLinksInNewWindow, platform })
  const html = (await processor.process(markdown)).toString()

  const hasKatex = html.includes('class="katex"')
    || html.includes('class="katex-display"')
    || html.includes('class="katex-mathml"')

  if (!markdownStyle && !codeTheme && !hasKatex) {
    return html
  }

  const markdownStyleCss = markdownStyle ? getMarkdownStyleById(markdownStyle)?.css : ''
  const codeThemeCss = codeTheme ? getCodeThemeById(codeTheme)?.css : ''
  const css = [
    markdownStyleCss,
    codeThemeCss,
    hasKatex ? katexCss : '',
  ].filter(Boolean).join('\n')

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
