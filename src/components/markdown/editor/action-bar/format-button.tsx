import { Wand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorCommandConfig } from '@/config'
import { formatMarkdown } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import { useMarkdownStore } from '@/stores/markdown'

export function FormatButton() {
  const { content, setContent } = useMarkdownStore()

  const onFormatClick = () => {
    trackEvent('editor', 'format', 'button')
    formatMarkdown(content, setContent)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            aria-label={editorCommandConfig.format.label}
            onClick={onFormatClick}
          >
            <Wand className="size-4" />
          </Button>
        )}
      />
      <TooltipContent>{editorCommandConfig.format.label}</TooltipContent>
    </Tooltip>
  )
}
