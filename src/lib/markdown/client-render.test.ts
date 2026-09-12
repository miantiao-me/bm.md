import type { PreviewRenderOptions, RenderPlatformHtmlOptions } from './client-render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    vi.clearAllMocks()
    mocks.markdown.render.mockResolvedValue({ result: '<p>渲染结果</p>' })
    mocks.markdown.preview.mockResolvedValue({ html: '<p>预览结果</p>', css: '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('浅色预览返回独立 CSS 和根容器，深色预览返回内联 HTML', async () => {
    mocks.markdown.preview.mockResolvedValue({ html: '<p>预览</p>', css: 'p { color: red; }' })
    await expect(renderMarkdownPreview(basePreviewOptions)).resolves.toEqual({
      html: '<section id="bm-md"><p>预览</p></section>',
      css: 'p { color: red; }',
    })
    expect(mocks.markdown.render).not.toHaveBeenCalled()
    await expect(renderMarkdownPreview({ ...basePreviewOptions, colorScheme: 'dark' })).resolves.toEqual({
      html: '<p>渲染结果</p>',
      css: '',
    })
  })

  it('三种路径共享参数映射，不把 content 或 colorScheme 传入 worker', async () => {
    await renderMarkdownPreview(basePreviewOptions)
    await renderMarkdownPreview({ ...basePreviewOptions, colorScheme: 'dark' })
    await expect(renderPlatformHtml(basePlatformOptions)).resolves.toBe('<p>渲染结果</p>')
    const input = mocks.markdown.preview.mock.calls[0][0]
    expect(input).not.toHaveProperty('content')
    expect(input).not.toHaveProperty('colorScheme')
    expect(input).not.toHaveProperty('platform')
    expect(input).toMatchObject({
      markdown: basePreviewOptions.content,
      markdownStyle: basePreviewOptions.markdownStyle,
      codeTheme: basePreviewOptions.codeTheme,
      mermaidTheme: basePreviewOptions.mermaidTheme,
      infographicTheme: basePreviewOptions.infographicTheme,
      infographicPalette: basePreviewOptions.infographicPalette,
      customCss: basePreviewOptions.customCss,
      enableFootnoteLinks: true,
      breaks: true,
      openLinksInNewWindow: true,
      footnoteLabel: expect.any(String),
      referenceTitle: expect.any(String),
    })
    expect(mocks.markdown.render.mock.calls[0][0]).toEqual(input)
    expect(mocks.markdown.render.mock.calls[1][0]).toEqual({ ...input, platform: 'wechat' })
  })

  it('输入对象携带额外字段时仍只发送原有渲染字段', async () => {
    const options = { ...basePlatformOptions, colorScheme: 'dark', extra: '忽略', footnoteLabel: '不可覆盖本地化' }
    await renderPlatformHtml(options)
    const input = mocks.markdown.render.mock.calls[0][0]
    expect(input).not.toHaveProperty('colorScheme')
    expect(input).not.toHaveProperty('extra')
    expect(input.footnoteLabel).not.toBe(options.footnoteLabel)
  })
})
