import { ClipboardCopy, Download, FileText, ImageDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorCommandConfig } from '@/config'
import { copyImage, exportImage } from '@/lib/actions/export-image'
import { exportPdf, printPreview } from '@/lib/actions/export-pdf'
import { trackEvent } from '@/lib/analytics'
import { useIsPreviewReady } from '../preview-ready'
import { runPreviewAction } from './preview-action-guard'

async function onCopyClick() {
  await runPreviewAction(async () => {
    trackEvent('copy', 'image', 'button')
    await copyImage()
  })
}

async function onExportClick() {
  await runPreviewAction(async () => {
    trackEvent('export', 'image', 'button')
    await exportImage()
  })
}

async function onExportPdfClick() {
  await runPreviewAction(async () => {
    trackEvent('export', 'pdf', 'button')
    await exportPdf()
  })
}

async function onPrintClick() {
  await runPreviewAction(() => {
    trackEvent('export', 'print', 'button')
    printPreview()
  })
}

export function ExportButton() {
  const isReady = useIsPreviewReady()

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button
                  variant="ghost"
                  size="icon"
                  className="disabled:opacity-100"
                  aria-label="导出"
                  disabled={!isReady}
                >
                  <Download className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>导出</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" disabled={!isReady} onClick={onCopyClick}>
          <ClipboardCopy className="size-4" />
          {editorCommandConfig.copyImage.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" disabled={!isReady} onClick={onExportClick}>
          <ImageDown className="size-4" />
          {editorCommandConfig.exportImage.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" disabled={!isReady} onClick={onExportPdfClick}>
          <FileText className="size-4" />
          {editorCommandConfig.exportPdf.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" disabled={!isReady} onClick={onPrintClick}>
          <Printer className="size-4" />
          {editorCommandConfig.printPreview.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
