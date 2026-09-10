import { Brush, ChevronDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { trackEvent } from '@/lib/analytics'
import { usePreviewStore } from '@/stores/preview'

const CSS_EXAMPLES = `/* 调整标题间距 */
#bm-md h1 { margin-bottom: 1rem; }
#bm-md h2 { margin-top: 1.5rem; }

/* 调整段落行高 */
#bm-md p { line-height: 1.8; }

/* 自定义引用块边界 */
#bm-md blockquote {
  border-left-width: 4px;
  padding-left: 1rem;
}

/* 图片居中显示 */
#bm-md img {
  margin: 0 auto;
}`

const MAX_CSS_LENGTH = 50000

export function CustomCssDialog() {
  const customCss = usePreviewStore(state => state.customCss)
  const setCustomCss = usePreviewStore(state => state.setCustomCss)
  const [localCss, setLocalCss] = useState(customCss)
  const [open, setOpen] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasCustomCss = customCss.trim().length > 0
  const isOverLimit = localCss.length > MAX_CSS_LENGTH

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setLocalCss(customCss)
    }
  }

  const handleSave = () => {
    if (isOverLimit) {
      textareaRef.current?.focus()
      return
    }
    setCustomCss(localCss)
    setOpen(false)
    trackEvent('style', 'custom-css', 'button')
  }

  const handleClear = () => {
    setLocalCss('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DialogTrigger
              render={(
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="自定义 CSS"
                >
                  <Brush className={hasCustomCss
                    ? 'size-4 text-primary'
                    : `size-4`}
                  />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>自定义 CSS</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>自定义 CSS</DialogTitle>
          <DialogDescription>
            CSS 选择器需约束在
            {' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs">#bm-md</code>
            {' '}
            下，在主题样式之后应用。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={isOverLimit}>
            <FieldLabel htmlFor="custom-css" className="sr-only">
              自定义 CSS
            </FieldLabel>
            <Textarea
              ref={textareaRef}
              id="custom-css"
              name="custom-css"
              value={localCss}
              onChange={e => setLocalCss(e.target.value)}
              placeholder="输入仅作用于 #bm-md 的自定义 CSS…"
              spellCheck={false}
              autoComplete="off"
              className="max-h-60 min-h-40 font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <FieldDescription className="tabular-nums">
                {localCss.length.toLocaleString()}
                {' / '}
                {MAX_CSS_LENGTH.toLocaleString()}
                {' '}
                字符
              </FieldDescription>
              {isOverLimit && <FieldError>请删减到 50,000 字符以内再保存</FieldError>}
            </div>
          </Field>
          <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
            <CollapsibleTrigger
              render={(
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  <span>查看示例</span>
                  <ChevronDown className={`
                    size-4 transition-transform
                    ${examplesOpen
                  ? `rotate-180`
                  : ''}
                  `}
                  />
                </Button>
              )}
            />
            <CollapsibleContent>
              <pre className={`
                mt-2 max-h-48 overflow-auto rounded-sm bg-muted p-3 font-mono
                text-xs
              `}
              >
                {CSS_EXAMPLES}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            清空
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
