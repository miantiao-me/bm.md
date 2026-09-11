import type { PreviewRenderOptions, RenderPlatformHtmlOptions } from './client-render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MARKDOWN_STYLE_ID } from '@/themes/markdown-style/metadata'
import { renderMarkdownPreview, renderPlatformHtml } from './client-render'

const mocks = vi.hoisted(() => ({
  markdown: {
    render: vi.fn(),
    preview: vi.fn(),
  },
}))

vi.mock('@/lib/markdown/browser', () => ({
  markdown: mocks.markdown,
}))

const basePreviewOptions = {
  content: '第一行\n第二行',
  markdownStyle: DEFAULT_MARKDOWN_STYLE_ID,
  codeTheme: 'kimbie-light',
  mermaidTheme: '',
  infographicTheme: 'default',
  infographicPalette: 'antv',
  customCss: '',
  enableFootnoteLinks: true,
  breaks: true,
  openLinksInNewWindow: true,
  colorScheme: 'light',
} satisfies PreviewRenderOptions

const basePlatformOptions = {
  platform: 'wechat',
  content: '第一行\n第二行',
  markdownStyle: DEFAULT_MARKDOWN_STYLE_ID,
  codeTheme: 'kimbie-light',
  mermaidTheme: '',
  infographicTheme: 'default',
  infographicPalette: 'antv',
  customCss: '',
  enableFootnoteLinks: true,
  breaks: true,
  openLinksInNewWindow: true,
} satisfies RenderPlatformHtmlOptions

describe('浏览器端 Markdown 渲染调用链', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.markdown.render.mockResolvedValue({ result: '<p>渲染结果</p>' })
    mocks.markdown.preview.mockResolvedValue({ html: '<p>预览结果</p>', css: '' })
  })

  it('预览调用 worker 时传递 breaks', async () => {
    await renderMarkdownPreview(basePreviewOptions)

    expect(mocks.markdown.preview).toHaveBeenCalledWith(expect.objectContaining({
      markdown: basePreviewOptions.content,
      breaks: true,
    }))
  })

  it('深色预览调用 render worker 时传递 breaks', async () => {
    await renderMarkdownPreview({ ...basePreviewOptions, colorScheme: 'dark' })

    expect(mocks.markdown.render).toHaveBeenCalledWith(expect.objectContaining({
      markdown: basePreviewOptions.content,
      breaks: true,
    }))
  })

  it('平台 HTML 调用 render worker 时传递 breaks', async () => {
    await renderPlatformHtml(basePlatformOptions)

    expect(mocks.markdown.render).toHaveBeenCalledWith(expect.objectContaining({
      markdown: basePlatformOptions.content,
      platform: 'wechat',
      breaks: true,
    }))
  })
})
