import { RotateCcw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { trackEvent } from '@/lib/analytics'
import { useMarkdownStore } from '@/stores/markdown'

interface ResetContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResetContentDialog({ open, onOpenChange }: ResetContentDialogProps) {
  const resetContent = useMarkdownStore(state => state.resetContent)

  const handleConfirm = () => {
    trackEvent('editor', 'reset', 'menu')
    resetContent()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RotateCcw />
          </AlertDialogMedia>
          <AlertDialogTitle>确认重置内容？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将清除当前编辑器中的所有内容，并恢复为默认示例文档。此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            确认重置
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
