import type { ReactNode } from 'react'
import type { SupportedPlatform } from '@/config'
import { Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { platformConfig } from '@/config'
import JuejinIcon from '@/icons/juejin'
import WechatIcon from '@/icons/wechat'
import ZhihuIcon from '@/icons/zhihu'
import { copyPlatform } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import { usePlatformCopy } from './use-platform-copy'

const platformIcons: Record<SupportedPlatform, ReactNode> = {
  wechat: <WechatIcon className="size-4" />,
  zhihu: <ZhihuIcon className="size-4" />,
  juejin: <JuejinIcon className="size-4" />,
  html: <Code2 className="size-4" />,
}

interface CopyButtonProps {
  platform: SupportedPlatform
}

export function CopyButton({ platform }: CopyButtonProps) {
  const { getHtml, isLoading } = usePlatformCopy(platform)
  const config = platformConfig[platform]

  const onCopyClick = async () => {
    trackEvent('copy', platform, 'button')
    await copyPlatform(platform, getHtml)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            aria-label={config.label}
            onClick={onCopyClick}
            disabled={isLoading}
          >
            {platformIcons[platform]}
          </Button>
        )}
      />
      <TooltipContent>{config.label}</TooltipContent>
    </Tooltip>
  )
}
