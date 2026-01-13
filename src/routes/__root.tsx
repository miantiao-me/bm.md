import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'

import { NotFound } from '@/components/not-found'
import { ThemeColorMeta } from '@/components/theme-color-meta'
import { Toaster } from '@/components/ui/sonner'
import { appConfig } from '@/config'
import { env } from '@/env'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: appConfig.title },
      { name: 'description', content: appConfig.description },
      { name: 'keywords', content: appConfig.keywords },
      { name: 'author', content: appConfig.name },
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
      { rel: 'preconnect', href: 'https://fonts.googleapis.cn' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.cn', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: `https://fonts.googleapis.cn/css2?family=Doto:wght@700&display=swap&text=${encodeURIComponent(['bm.md', '404'].join(''))}` },
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: appConfig.url },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preload', href: '/blur-mask.svg', as: 'image', type: 'image/svg+xml' },
      { rel: 'canonical', href: appConfig.url },
    ],
  }),
  beforeLoad: () => {
    return {
      analytics: {
        scriptUrl: env.ANALYTICS_SCRIPT_URL,
        siteId: env.ANALYTICS_SITE_ID,
      },
    }
  },
  component: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument() {
  const { analytics } = Route.useRouteContext()
  const analyticsEnabled = analytics.scriptUrl && analytics.siteId

  useEffect(() => {
    Promise.all([
      import('@/lib/pwa').then(({ initPWA }) => initPWA()),
      import('@/lib/file-handler').then(({ initFileHandler }) => initFileHandler()),
    ])
  }, [])

  return (
    <html lang="zh-CMN-Hans" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableColorScheme
        >
          <Outlet />
          <ThemeColorMeta />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
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
