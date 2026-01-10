import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useFileReplaceStore } from '@/stores/file-replace'

export function FileReplaceDialog() {
  const { isOpen, fileName, close, confirm } = useFileReplaceStore()

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>替换编辑器内容</AlertDialogTitle>
          <AlertDialogDescription>
            是否用 "
            {fileName}
            " 替换当前编辑器内容？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>替换</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
