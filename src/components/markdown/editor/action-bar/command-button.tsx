import { Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCommandPaletteStore } from '@/stores/command-palette'

export function CommandButton() {
  const setOpen = useCommandPaletteStore(state => state.setOpen)

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            aria-label="命令面板"
            onClick={() => setOpen(true)}
          >
            <Command className="size-4" />
          </Button>
        )}
      />
      <TooltipContent>命令面板</TooltipContent>
    </Tooltip>
  )
}
