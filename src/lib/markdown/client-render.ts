import type { Platform } from '@/lib/markdown/render/adapters'
import type { MarkdownStyleId } from '@/themes/markdown-style/metadata'
import { getMarkdownLocaleTexts } from '@/lib/locale'

export interface PreviewRenderOptions {
  content: string
  markdownStyle: MarkdownStyleId
  codeTheme: string
  mermaidTheme: string
  infographicTheme: string
  infographicPalette: string
  customCss: string
  enableFootnoteLinks: boolean
  openLinksInNewWindow: boolean
  colorScheme: string
}

export interface RenderPlatformHtmlOptions {
  platform: Platform
  content: string
  markdownStyle: MarkdownStyleId
  codeTheme: string
  mermaidTheme: string
  infographicTheme: string
  infographicPalette: string
  customCss: string
  enableFootnoteLinks: boolean
  openLinksInNewWindow: boolean
}

export async function renderMarkdownPreview({
  content,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  customCss,
  enableFootnoteLinks,
  openLinksInNewWindow,
  colorScheme,
}: PreviewRenderOptions): Promise<{ html: string, css: string }> {
  const { markdown } = await import('@/lib/markdown/browser')
  const renderInput = {
    markdown: content,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographicTheme,
    infographicPalette,
    customCss,
    enableFootnoteLinks,
    openLinksInNewWindow,
    ...getMarkdownLocaleTexts(),
  }

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
  content,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  customCss,
  enableFootnoteLinks,
  openLinksInNewWindow,
}: RenderPlatformHtmlOptions): Promise<string> {
  const { markdown } = await import('@/lib/markdown/browser')
  const result = await markdown.render({
    markdown: content,
    markdownStyle,
    codeTheme,
    mermaidTheme,
    infographicTheme,
    infographicPalette,
    customCss,
    enableFootnoteLinks,
    openLinksInNewWindow,
    platform,
    ...getMarkdownLocaleTexts(),
  })

  return result.result
}
