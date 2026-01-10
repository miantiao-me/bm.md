import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CodeThemeMenu } from './code-theme-menu'
import { CopyButton } from './copy-button'
import { ExportImageButton } from './export-image-button'
import { MarkdownStyleMenu } from './markdown-style-menu'

export function PreviewerActionBar() {
  return (
    <TooltipProvider>
      <CopyButton platform="wechat" />
      <CopyButton platform="zhihu" />
      <CopyButton platform="juejin" />
      <CopyButton platform="html" />
      <ExportImageButton />
      <Separator orientation="vertical" className="mx-2" />
      <MarkdownStyleMenu />
      <CodeThemeMenu />
    </TooltipProvider>
  )
}
