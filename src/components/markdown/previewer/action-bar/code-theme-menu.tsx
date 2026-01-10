import { Code } from 'lucide-react'
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
import { codeThemes } from '@/themes/code-theme'

const codeThemeTooltip = '代码主题'
const codeThemeAriaLabel = '代码主题'

export function CodeThemeMenu() {
  const currentTheme = usePreviewStore(state => state.codeTheme)
  const setCodeTheme = usePreviewStore(state => state.setCodeTheme)

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label={codeThemeAriaLabel}>
                  <Code className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>{codeThemeTooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>代码主题</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentTheme} onValueChange={setCodeTheme}>
            {codeThemes.map(theme => (
              <DropdownMenuRadioItem
                key={theme.id}
                value={theme.id}
                className="cursor-pointer"
              >
                {theme.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
