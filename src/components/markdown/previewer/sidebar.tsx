import { ClientOnly, Link } from '@tanstack/react-router'
import { LampDesk, Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { editorCommandConfig, navigationConfig, viewModeConfig } from '@/config'
import { toggleTheme } from '@/lib/actions/toggle-theme'
import { trackEvent } from '@/lib/analytics'
import { getIcon } from '@/lib/icon-map'
import {
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from '@/stores/preview'

const internalNavigationItems = navigationConfig.internal.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

const externalNavigationItems = navigationConfig.external.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

export default function MarkdownPreviewerSidebar() {
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const previewColorScheme = usePreviewStore(state => state.previewColorScheme)
  const setPreviewWidth = usePreviewStore(state => state.setPreviewWidth)
  const togglePreviewColorScheme = usePreviewStore(state => state.togglePreviewColorScheme)
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'
  const isPreviewDark = previewColorScheme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const handleThemeToggle = () => {
    trackEvent('theme', 'toggle', 'button')
    toggleTheme(isDark, setTheme)
  }

  const handlePreviewThemeToggle = () => {
    trackEvent('preview', 'toggle-theme', 'button', {
      to: isPreviewDark ? 'light' : 'dark',
    })
    togglePreviewColorScheme()
  }

  return (
    <div className="flex w-11 flex-col items-center border-l py-2">
      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              variant="ghost"
              size="icon"
              aria-label="切换主题"
              aria-pressed={isDark}
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
              aria-pressed={isMobileView}
              onClick={() => setPreviewWidth(PREVIEW_WIDTH_MOBILE)}
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
              aria-pressed={isDesktopView}
              onClick={() => setPreviewWidth(PREVIEW_WIDTH_DESKTOP)}
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

      <Tooltip>
        <TooltipTrigger
          render={(
            <Button
              variant="ghost"
              size="icon"
              aria-label={isPreviewDark ? '预览区切换到浅色模式' : '预览区切换到深色模式'}
              aria-pressed={!isPreviewDark}
              onClick={handlePreviewThemeToggle}
            >
              <LampDesk className={isPreviewDark
                ? 'size-4'
                : 'size-4 text-primary'}
              />
            </Button>
          )}
        />
        <TooltipContent side="left">
          {isPreviewDark ? '预览区切换到浅色模式' : '预览区切换到深色模式'}
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {internalNavigationItems.map(item => (
        <Tooltip key={item.path}>
          <TooltipTrigger
            render={(
              <Link
                to={item.path}
                aria-label={item.label}
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <item.Icon className="size-4" />
              </Link>
            )}
          />
          <TooltipContent side="left">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="horizontal" className="my-1 px-1" />

      {externalNavigationItems.map(item => (
        <Tooltip key={item.url}>
          <TooltipTrigger
            render={(
              <a
                href={item.url}
                aria-label={item.label}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <item.Icon className="size-4" />
              </a>
            )}
          />
          <TooltipContent side="left">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
