import type { SupportedPlatform } from '@/config'
import { toast } from 'sonner'
import { platformConfig } from '@/config'
import { trackEvent } from '@/lib/analytics'
import { copyHtml } from '@/lib/clipboard'
import { uploadLocalImages } from '@/services/upload-local-images'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { useImageUploadStore } from '@/stores/image-upload'
import { usePreviewStore } from '@/stores/preview'
import { findLocalImagesInMarkdown, replaceImageUrlsInMarkdown } from './check-local-images'

const developingPlatforms: SupportedPlatform[] = ['zhihu', 'juejin']

interface CopyPlatformOptions {
  platform: SupportedPlatform
  markdownStyle: string
  codeTheme: string
  mermaidTheme: string
  infographicTheme: string
  infographicPalette: string
  source: 'button' | 'menu'
  getHtml: () => Promise<string>
}

async function renderAndCopy(
  markdown: string,
  platform: SupportedPlatform,
  config: { successMessage: string },
  source: string,
  opts: { markdownStyle: string, codeTheme: string, mermaidTheme: string, infographicTheme: string, infographicPalette: string },
) {
  const { getMarkdownLocaleTexts } = await import('@/lib/locale')
  const { markdown: md } = await import('@/lib/markdown/browser')
  const result = await md.render({
    markdown,
    markdownStyle: opts.markdownStyle,
    codeTheme: opts.codeTheme,
    enableFootnoteLinks: useEditorStore.getState().enableFootnoteLinks,
    openLinksInNewWindow: useEditorStore.getState().openLinksInNewWindow,
    platform,
    ...getMarkdownLocaleTexts(),
  })

  if (!result.result.trim()) {
    toast.error('没有可复制的内容')
    return
  }

  const success = await copyHtml(result.result)
  if (success) {
    toast.success(config.successMessage)
    trackEvent('copy', platform, source, opts)
  }
  else {
    toast.error('复制失败')
  }
}

export async function copyPlatform({
  platform,
  markdownStyle,
  codeTheme,
  mermaidTheme,
  infographicTheme,
  infographicPalette,
  source,
  getHtml,
}: CopyPlatformOptions) {
  if (developingPlatforms.includes(platform)) {
    toast.info('功能开发中，敬请期待')
    return
  }

  const content = useFilesStore.getState().currentContent
  const localImages = findLocalImagesInMarkdown(content)

  if (localImages.length > 0) {
    const confirmed = await useImageUploadStore.getState().showDialog(localImages)

    if (confirmed) {
      useImageUploadStore.setState({ isUploading: true })
      try {
        const results = await uploadLocalImages(
          localImages.map(img => ({ url: img.url })),
        )

        const replacements = new Map<string, string>()
        for (const r of results) {
          if (r.cdnUrl) {
            replacements.set(r.originalUrl, r.cdnUrl)
          }
        }

        if (results.some(r => !r.cdnUrl)) {
          const failed = results.filter(r => !r.cdnUrl).length
          toast.warning(`${failed} 张图片上传失败，已跳过`)
        }

        if (replacements.size === 0) {
          return
        }

        const newContent = replaceImageUrlsInMarkdown(content, replacements)
        useFilesStore.getState().setCurrentContent(newContent)
        usePreviewStore.getState().clearRenderedHtmlCache()

        const config = platformConfig[platform]
        await renderAndCopy(newContent, platform, config, source, {
          markdownStyle,
          codeTheme,
          mermaidTheme,
          infographicTheme,
          infographicPalette,
        })
        return
      }
      catch (err) {
        const message = err instanceof Error ? err.message : '上传失败'
        toast.error(message)
        return
      }
      finally {
        useImageUploadStore.setState({ isUploading: false })
      }
    }
    else {
      return
    }
  }

  const config = platformConfig[platform]
  try {
    const html = await getHtml()
    if (!html.trim()) {
      toast.error('没有可复制的内容')
      return
    }
    const success = await copyHtml(html)
    if (success) {
      toast.success(config.successMessage)
      trackEvent('copy', platform, source, {
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographicTheme,
        infographicPalette,
      })
    }
    else {
      toast.error('复制失败')
    }
  }
  catch {
    toast.error('渲染失败')
  }
}
