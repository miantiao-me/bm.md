import type { output } from 'zod'
import type { renderDefinition } from './render/definition'
import { getMarkdownLocaleTexts } from '@/lib/locale'

type RenderInput = output<typeof renderDefinition.inputSchema>
type ClientRenderOptions = Omit<RenderInput, 'markdown' | 'platform' | 'footnoteLabel' | 'referenceTitle'> & {
  content: RenderInput['markdown']
}

export interface PreviewRenderOptions extends ClientRenderOptions {
  colorScheme: string
}

export interface RenderPlatformHtmlOptions extends ClientRenderOptions, Pick<RenderInput, 'platform'> {}

function createRenderInput({
  content,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  customCss,
  enableFootnoteLinks,
  breaks,
  openLinksInNewWindow,
}: ClientRenderOptions) {
  return {
    markdown: content,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographicTheme,
    infographicPalette,
    customCss,
    enableFootnoteLinks,
    breaks,
    openLinksInNewWindow,
    ...getMarkdownLocaleTexts(),
  }
}

export async function renderMarkdownPreview({
  colorScheme,
  ...options
}: PreviewRenderOptions): Promise<{ html: string, css: string }> {
  const { markdown } = await import('@/lib/markdown/browser')
  const renderInput = createRenderInput(options)

  const result = colorScheme === 'dark'
    ? await markdown.render(renderInput)
    : await markdown.preview(renderInput)

  if ('result' in result) {
    return { html: result.result, css: '' }
  }

  return { html: `<section id="bm-md">${result.html}</section>`, css: result.css }
}

export async function renderPlatformHtml({
  platform,
  ...options
}: RenderPlatformHtmlOptions): Promise<string> {
  const { markdown } = await import('@/lib/markdown/browser')
  const result = await markdown.render({
    ...createRenderInput(options),
    platform,
  })

  return result.result
}
