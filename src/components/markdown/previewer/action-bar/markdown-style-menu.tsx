import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePreviewStore } from '@/stores/preview'
import { markdownStyles } from '@/themes/markdown-style'

const styleTooltip = '排版样式'
const styleAriaLabel = '排版样式'

export function MarkdownStyleMenu() {
  const currentStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label={styleAriaLabel}>
                  <Palette className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>{styleTooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>排版样式</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentStyle} onValueChange={setMarkdownStyle}>
            {markdownStyles.map(style => (
              <DropdownMenuRadioItem
                key={style.id}
                value={style.id}
                className="cursor-pointer"
              >
                {style.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
