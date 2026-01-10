import copy from 'copy-to-clipboard'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const success = copy(text)
    if (success) {
      setCopied(true)
      toast.success('复制成功')
      setTimeout(() => setCopied(false), 2000)
    }
    else {
      toast.error('复制失败')
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleCopy} className={className}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  )
}
