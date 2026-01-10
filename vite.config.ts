import { createRequire } from 'node:module'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
// import { analyzer } from 'vite-bundle-analyzer'
import { VitePWA } from 'vite-plugin-pwa'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { name } from './package.json'
import { cssRawMinifyPlugin, htmlRawMinifyPlugin, markdownPlugin } from './scripts/vite'
import { appConfig } from './src/config/app'

const require = createRequire(import.meta.url)

let customPreset: string | undefined
if (process.env.AliUid) {
  // 阿里云 ESA
  customPreset = './preset/aliyun-esa/nitro.config.ts'
}
else if (process.env.HOME === '/dev/shm/home' && process.env.TMPDIR === '/dev/shm/tmp') {
  // 腾讯云 EdgeOne
  customPreset = './preset/tencent-edgeone/nitro.config.ts'
}

console.info('Using Nitro Preset:', customPreset || 'auto')

const config = defineConfig({
  plugins: [
    // analyzer(),
    cssRawMinifyPlugin(),
    htmlRawMinifyPlugin(),
    markdownPlugin(),
    devtools(),
    ...(process.env.NODE_ENV !== 'test'
      ? [nitro({
          preset: customPreset,
          cloudflare: {
            wrangler: {
              name,
              observability: { enabled: true },
              keep_vars: true,
            },
          },
          vercel: {
            functions: {
              runtime: 'bun1.x',
            },
          },
        })]
      : []),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        // enabled: true,
        filter: ({ path }) => path === '/' || path.startsWith('/docs'),
      },
    }),
    viteReact({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: appConfig.name,
        short_name: appConfig.name,
        description: appConfig.description,
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: appConfig.themeColor.dark,
        background_color: appConfig.themeColor.dark,
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
            },
          },
        ],
        launch_handler: {
          client_mode: 'navigate-existing',
        },
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      'decode-named-character-reference': require.resolve('decode-named-character-reference'),
      'hast-util-from-html-isomorphic': require.resolve('hast-util-from-html-isomorphic'),
    },
  },
  worker: {
    format: 'es',
  },
})

export default config
