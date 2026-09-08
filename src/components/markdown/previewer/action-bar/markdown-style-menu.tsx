import { LayoutGrid, Palette } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { trackEvent } from '@/lib/analytics'
import { usePreviewStore } from '@/stores/preview'
import { markdownStyles } from '@/themes/markdown-style/metadata'
import { MarkdownStyleGalleryDialog } from './markdown-style-gallery-dialog'
import { RadioMenuGroup } from './radio-menu'

const label = '排版样式'
/** 下拉菜单只放最常用的前几个，避免列表过长；完整列表交给样式画廊弹窗 */
const QUICK_STYLE_COUNT = 8
const quickStyles = markdownStyles.slice(0, QUICK_STYLE_COUNT)

export function MarkdownStyleMenu() {
  const currentStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const handleOpenGallery = () => {
    trackEvent('style', 'gallery-open', 'button')
    setGalleryOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={(
              <DropdownMenuTrigger
                render={(
                  <Button variant="ghost" size="icon" aria-label={label}>
                    <Palette className="size-4" />
                  </Button>
                )}
              />
            )}
          />
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <RadioMenuGroup
            label={label}
            items={quickStyles}
            value={currentStyle}
            onValueChange={setMarkdownStyle}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={handleOpenGallery}>
            <LayoutGrid className="size-4" />
            浏览全部样式…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MarkdownStyleGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        value={currentStyle}
        onValueChange={setMarkdownStyle}
      />
    </>
  )
}
