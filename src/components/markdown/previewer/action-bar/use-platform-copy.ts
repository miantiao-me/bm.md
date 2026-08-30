import type { Platform } from '@/lib/markdown/render/adapters'
import { useState } from 'react'
import { renderPlatformHtml } from '@/lib/markdown/client-render'
import { useEditorStore } from '@/stores/editor'
import { isFileContentReady, useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'

export interface PlatformCopyResult {
  getHtml: () => Promise<string>
  isLoading: boolean
  isReady: boolean
}

export function usePlatformCopy(platform: Platform): PlatformCopyResult {
  const [isLoading, setIsLoading] = useState(false)
  const isReady = useFilesStore(isFileContentReady)

  const getHtml = async (): Promise<string> => {
    const filesState = useFilesStore.getState()
    if (!isFileContentReady(filesState)) {
      throw new Error('文件仍在加载')
    }

    setIsLoading(true)

    try {
      const { currentContent: content } = filesState
      const {
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographic,
        customCss,
      } = usePreviewStore.getState()
      const { enableFootnoteLinks, openLinksInNewWindow } = useEditorStore.getState()

      const html = await renderPlatformHtml({
        platform,
        content,
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographicTheme: infographic.theme,
        infographicPalette: infographic.palette,
        customCss,
        enableFootnoteLinks,
        openLinksInNewWindow,
      })
      setIsLoading(false)
      return html
    }
    catch (err) {
      console.error(`[${platform}] 渲染失败:`, err)
      setIsLoading(false)
      throw err instanceof Error ? err : new Error('渲染失败')
    }
  }

  return { getHtml, isLoading, isReady }
}
