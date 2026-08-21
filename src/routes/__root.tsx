import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { createClientOnlyFn } from '@tanstack/react-start'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'

import { NotFound } from '@/components/not-found'
import { ThemeColorMeta } from '@/components/theme-color-meta'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { appConfig } from '@/config'
import { env } from '@/env'
import { GOOGLE_FONTS_CSS_BASE_URL, GOOGLE_FONTS_CSS_ORIGIN, GOOGLE_FONTS_STATIC_ORIGIN } from '@/lib/google-fonts'
import { logSafeError } from '@/lib/log-safe-error'

import appCss from '../styles.css?url'

const initClientIntegrations = createClientOnlyFn(async () => {
  const integrations = await import('@/lib/client-integrations.client')
  return integrations.initClientIntegrations()
})

// Google Fonts URL - 仅加载 Logo 使用的字符
const fontUrl = `${GOOGLE_FONTS_CSS_BASE_URL}?family=Doto:wght@700&display=swap&text=${encodeURIComponent(['bm.md', '404'].join(''))}`

export const Route = createRootRoute({
  beforeLoad: () => {
    return {
      analytics: {
        scriptUrl: env.ANALYTICS_SCRIPT_URL,
        siteId: env.ANALYTICS_SITE_ID,
      },
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: appConfig.title },
      { name: 'application-name', content: appConfig.name },
      { name: 'description', content: appConfig.description },
      { name: 'keywords', content: appConfig.keywords },
      { name: 'author', content: appConfig.name },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: appConfig.name },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: appConfig.url },
      { property: 'og:title', content: appConfig.title },
      { property: 'og:description', content: appConfig.description },
      { property: 'og:image', content: `${appConfig.url}/banner.png` },
      { property: 'og:site_name', content: appConfig.name },
      { property: 'og:locale', content: 'zh_CN' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: appConfig.title },
      { name: 'twitter:description', content: appConfig.description },
      { name: 'twitter:image', content: `${appConfig.url}/banner.png` },
    ],
    links: [
      // Preconnect
      { rel: 'preconnect', href: GOOGLE_FONTS_CSS_ORIGIN },
      { rel: 'preconnect', href: GOOGLE_FONTS_STATIC_ORIGIN, crossOrigin: 'anonymous' },
      // Preload 关键资源
      { rel: 'preload', href: fontUrl, as: 'style', crossOrigin: 'anonymous' },
      { rel: 'preload', href: appCss, as: 'style' },
      // Stylesheets
      { rel: 'stylesheet', href: fontUrl },
      { rel: 'stylesheet', href: appCss },
      // Meta
      { rel: 'canonical', href: appConfig.url },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'apple-touch-icon-precomposed', sizes: '180x180', href: '/apple-touch-icon-precomposed.png' },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument() {
  const { analytics } = Route.useRouteContext()
  const analyticsEnabled = analytics.scriptUrl && analytics.siteId

  useEffect(() => {
    void initClientIntegrations().catch((error) => {
      logSafeError('[bm.md] 客户端初始化失败', error)
    })
  }, [])

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableColorScheme
        >
          <TooltipProvider>
            <Outlet />
            <ThemeColorMeta />
          </TooltipProvider>
        </ThemeProvider>
        {env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
        )}
        <Scripts />
        <Toaster />
        {analyticsEnabled && (
          <script
            src={analytics.scriptUrl}
            data-site-id={analytics.siteId}
            defer
          />
        )}
      </body>
    </html>
  )
}
