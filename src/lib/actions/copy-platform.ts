import type { SupportedPlatform } from '@/config'
import copy from 'copy-to-clipboard'
import { toast } from 'sonner'
import { platformConfig } from '@/config'

const developingPlatforms: SupportedPlatform[] = ['zhihu', 'juejin']

export async function copyPlatform(
  platform: SupportedPlatform,
  getHtml: () => Promise<string>,
) {
  if (developingPlatforms.includes(platform)) {
    toast.info('功能开发中，敬请期待')
    return
  }

  const config = platformConfig[platform]
  try {
    const html = await getHtml()
    if (!html.trim()) {
      toast.error('没有可复制的内容')
      return
    }
    const success = copy(html, { format: 'text/html' })
    if (success) {
      toast.success(config.successMessage)
    }
    else {
      toast.error('复制失败')
    }
  }
  catch {
    toast.error('渲染失败')
  }
}
