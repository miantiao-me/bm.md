import { ImageUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useImageUploadStore } from '@/stores/image-upload'

export function ImageUploadDialog() {
  const images = useImageUploadStore(state => state.images)
  const isOpen = useImageUploadStore(state => state.isOpen)
  const isUploading = useImageUploadStore(state => state.isUploading)
  const confirmUpload = useImageUploadStore(state => state.confirmUpload)
  const cancelUpload = useImageUploadStore(state => state.cancelUpload)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isUploading) {
          cancelUpload()
        }
      }}
    >
      <DialogContent showCloseButton={!isUploading}>
        <DialogHeader>
          <DialogTitle>发现本地图片</DialogTitle>
          <DialogDescription>
            检测到
            {' '}
            {images.length}
            {' '}
            张本地图片，确认上传到 GitHub CDN 后，将自动替换 Markdown 中的链接为加速地址。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto">
          {images.map((img, index) => (
            <div
              key={index}
              className={`
                flex items-center gap-2 rounded px-2 py-1 text-xs
                text-muted-foreground
                hover:bg-accent
              `}
            >
              <ImageUp className="size-3 shrink-0" />
              <span className="truncate">{img.filename}</span>
              <code className={`
                ml-auto shrink-0 truncate text-[10px] text-muted-foreground/60
              `}
              >
                {img.url}
              </code>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isUploading}
            onClick={cancelUpload}
          >
            取消
          </Button>
          <Button
            onClick={confirmUpload}
            disabled={isUploading}
          >
            {isUploading && <Loader2 className="size-3 animate-spin" />}
            {isUploading ? '上传中...' : '确认上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
