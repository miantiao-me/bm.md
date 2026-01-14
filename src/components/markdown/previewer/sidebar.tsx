import { ClientOnly, Link } from '@tanstack/react-router'
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { editorCommandConfig, navigationConfig, viewModeConfig } from '@/config'
import { getIcon, toggleTheme } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import {
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from '@/stores/preview'

export default function MarkdownPreviewerSidebar() {
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const setUserPreferredWidth = usePreviewStore(state => state.setUserPreferredWidth)
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const handleThemeToggle = () => {
    trackEvent('theme', 'toggle', 'button')
    toggleTheme(isDark, setTheme)
  }

  return (
    <TooltipProvider>
      <div className="flex w-11 flex-col items-center border-l py-2">
        <Tooltip>
          <TooltipTrigger
            render={(
              <Button
                variant="ghost"
                size="icon"
                aria-label="切换主题"
                onClick={handleThemeToggle}
              >
                <ClientOnly fallback={<Sun className="size-4" />}>
                  {isDark
                    ? <Sun className="size-4" />
                    : (
                        <Moon className="size-4" />
                      )}
                </ClientOnly>
              </Button>
            )}
          />
          <TooltipContent side="left">
            {isDark ? editorCommandConfig.themeToggle.labelDark : editorCommandConfig.themeToggle.labelLight}
          </TooltipContent>
        </Tooltip>

        <Separator orientation="horizontal" className="my-1 px-1" />

        <Tooltip>
          <TooltipTrigger
            render={(
              <Button
                variant="ghost"
                size="icon"
                aria-label={viewModeConfig.mobile.label}
                onClick={() => setUserPreferredWidth(PREVIEW_WIDTH_MOBILE)}
              >
                <Smartphone className={isMobileView
                  ? 'size-4 text-primary'
                  : `size-4`}
                />
              </Button>
            )}
          />
          <TooltipContent side="left">
            {viewModeConfig.mobile.label}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={(
              <Button
                variant="ghost"
                size="icon"
                aria-label={viewModeConfig.desktop.label}
                onClick={() => setUserPreferredWidth(PREVIEW_WIDTH_DESKTOP)}
              >
                <Monitor className={isDesktopView
                  ? 'size-4 text-primary'
                  : `size-4`}
                />
              </Button>
            )}
          />
          <TooltipContent side="left">
            {viewModeConfig.desktop.label}
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {navigationConfig.internal.map((item) => {
          const Icon = getIcon(item.icon)
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger
                render={(
                  <Link
                    to={item.path}
                    title={item.label}
                    aria-label={item.label}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                  >
                    <Icon className="size-4" />
                  </Link>
                )}
              />
              <TooltipContent side="left">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        })}

        <Separator orientation="horizontal" className="my-1 px-1" />

        {navigationConfig.external.map((item) => {
          const Icon = getIcon(item.icon)
          return (
            <Tooltip key={item.url}>
              <TooltipTrigger
                render={(
                  <a
                    href={item.url}
                    title={item.label}
                    aria-label={item.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                  >
                    <Icon className="size-4" />
                  </a>
                )}
              />
              <TooltipContent side="left">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
