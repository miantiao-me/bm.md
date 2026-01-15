import { ClipboardCopy, Download, ImageDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorCommandConfig } from '@/config'
import { copyImage, exportImage, exportPdf } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'

export function ExportImageButton() {
  const onCopyClick = async () => {
    trackEvent('copy', 'image', 'button')
    await copyImage()
  }

  const onExportClick = async () => {
    trackEvent('export', 'image', 'button')
    await exportImage()
  }

  const onPrintClick = () => {
    trackEvent('print', 'pdf', 'button')
    exportPdf()
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label={editorCommandConfig.exportImage.label}>
                  <ImageDown className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>{editorCommandConfig.exportImage.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={onCopyClick}>
          <ClipboardCopy className="size-4" />
          {editorCommandConfig.copyImage.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={onExportClick}>
          <Download className="size-4" />
          {editorCommandConfig.exportImage.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={onPrintClick}>
          <Printer className="size-4" />
          {editorCommandConfig.exportPdf.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
