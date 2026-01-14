import type { useRender as useRenderType } from '@base-ui/react/use-render'

import { useRender } from '@base-ui/react/use-render'
import { useNavigate } from '@tanstack/react-router'

import { Logo } from '@/components/logo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PageDialogProps extends useRenderType.ComponentProps<'div'> {
  title?: string
  description?: string
  className?: string
  actions?: React.ReactNode
}

export default function PageDialog({
  title = 'Preview',
  description,
  className,
  actions,
  render,
  ...props
}: PageDialogProps) {
  const navigate = useNavigate()

  const contentElement = useRender({
    defaultTagName: 'div',
    render,
    props,
  })

  return (
    <Dialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          void navigate({ to: '/' })
        }
      }}
    >
      <DialogContent
        className={cn(
          'flex max-h-[80vh] flex-col gap-0',
          'sm:max-w-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2 pr-6">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-xl">
              <Logo />
              {' '}
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {actions && (
            <div className="-mt-2 flex shrink-0 gap-1">
              {actions}
            </div>
          )}
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          {contentElement}
        </div>
      </DialogContent>
    </Dialog>
  )
}
