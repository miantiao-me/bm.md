import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorCommandConfig } from '@/config'
import { handleImportFiles } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'

export function ImportButton() {
  const onImportClick = () => {
    trackEvent('editor', 'import', 'button')
    handleImportFiles()
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            aria-label={editorCommandConfig.import.label}
            onClick={onImportClick}
          >
            <FileUp className="size-4" />
          </Button>
        )}
      />
      <TooltipContent>{editorCommandConfig.import.label}</TooltipContent>
    </Tooltip>
  )
}
