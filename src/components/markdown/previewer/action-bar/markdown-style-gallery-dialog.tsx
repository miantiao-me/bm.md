import type { MarkdownStyleId } from '@/themes/markdown-style/metadata'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { loadMarkdownStyleCss } from '@/themes/markdown-style/loader'
import { markdownStyles } from '@/themes/markdown-style/metadata'

/** 用于画廊缩略图的固定示例内容，覆盖标题/正文/列表/引用/代码等常见元素 */
const PREVIEW_CONTENT = `
<h1>标题 Heading</h1>
<p>这是一段正文示例，包含<strong>粗体文字</strong>、<em>斜体文字</em>与<a href="#">链接文本</a>，用于展示这个排版风格的字体、色彩与间距气质。</p>
<h2>小标题 Subheading</h2>
<ul>
  <li>第一个列表项目</li>
  <li>第二个列表项目</li>
</ul>
<blockquote><p>引用文字示例，用于查看引用块的边框与底色处理。</p></blockquote>
<pre><code>const style = 'preview'</code></pre>
`.trim()

function buildPreviewDocument(styleId: MarkdownStyleId): string {
  const css = loadMarkdownStyleCss(styleId)
  return `<!doctype html><html><head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;overflow:hidden;}${css}</style></head><body><section id="bm-md">${PREVIEW_CONTENT}</section></body></html>`
}

interface MarkdownStyleGalleryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MarkdownStyleId
  onValueChange: (id: MarkdownStyleId) => void
}

export function MarkdownStyleGalleryDialog({
  open,
  onOpenChange,
  value,
  onValueChange,
}: MarkdownStyleGalleryDialogProps) {
  const handleSelect = (styleId: MarkdownStyleId) => {
    onValueChange(styleId)
    trackEvent('style', 'gallery-select', 'dialog', { style: styleId })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        flex max-h-[85vh] flex-col gap-0
        sm:max-w-4xl
      "
      >
        <DialogHeader>
          <DialogTitle>浏览全部排版样式</DialogTitle>
          <DialogDescription>点击任意样式即可应用到当前预览</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="
            grid grid-cols-2 gap-3
            sm:grid-cols-3
          "
          >
            {markdownStyles.map((style) => {
              const isSelected = style.id === value
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleSelect(style.id)}
                  data-selected={isSelected}
                  className={cn(
                    `
                      flex flex-col overflow-hidden text-left ring-1
                      ring-foreground/10 transition-colors
                    `,
                    'hover:ring-foreground/30',
                    isSelected && 'ring-2 ring-primary',
                  )}
                >
                  <span className="
                    relative block h-40 overflow-hidden border-b
                    border-foreground/10 bg-muted
                  "
                  >
                    <iframe
                      srcDoc={buildPreviewDocument(style.id)}
                      title={`${style.name} 预览`}
                      aria-hidden="true"
                      tabIndex={-1}
                      loading="lazy"
                      sandbox=""
                      className="pointer-events-none size-full border-0"
                    />
                    {isSelected && (
                      <span className="
                        absolute top-2 right-2 flex size-5 items-center
                        justify-center bg-primary text-primary-foreground
                      "
                      >
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 p-2.5">
                    <span className="text-sm font-medium">
                      {style.name}
                      {isSelected && <span className="sr-only">，当前选中</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
