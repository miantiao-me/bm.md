import { createRequire } from 'node:module'
import { env } from 'node:process'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json' with { type: 'json' }
import { cssRawMinifyPlugin, markdownPlugin } from './scripts/vite/index.ts'
import { resolvePlatformConfig } from './scripts/vite/platform.ts'
import { appConfig } from './src/config/app.ts'
import { DOCUMENT_MIME_EXTENSIONS } from './src/lib/document/files.ts'
import { MARKDOWN_FILE_EXTENSIONS } from './src/lib/markdown-file.ts'

const require = createRequire(import.meta.url)
const platformConfig = resolvePlatformConfig(env)
const codemirrorPackages = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/language-data',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
]
const dynamicOptimizeDeps = [
  '@orpc/client',
  '@orpc/client/message-port',
  '@orpc/server',
  '@orpc/server/message-port',
  '@antv/infographic',
  '@antv/infographic/ssr',
  '@zumer/snapdom',
  'beautiful-mermaid',
  'juice',
  'markdownlint',
  'markdownlint/promise',
  'workbox-window',
]

console.info('Using Nitro Preset:', platformConfig.nitroPreset || 'auto')

const config = defineConfig({
  plugins: [
    cssRawMinifyPlugin(),
    markdownPlugin(),
    devtools(),
    ...(
      env.NODE_ENV !== 'test'
        ? [nitro({
            preset: platformConfig.nitroPreset,
            unenv: platformConfig.nitroUnenv,
            cloudflare: {
              nodeCompat: true,
              wrangler: {
                name: packageJson.name,
                compatibility_date: '2026-07-12',
                observability: { enabled: true },
                keep_vars: true,
              },
            },
          })]
        : []),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: platformConfig.prerender,
        filter: ({ path }) =>
          path === '/'
          || path === '/about'
          || path.startsWith('/docs'),
      },
    }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      outDir: platformConfig.pwaOutDir,
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: appConfig.name,
        short_name: appConfig.name,
        description: appConfig.description,
        lang: 'zh-CN',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: appConfig.themeColor.dark,
        background_color: appConfig.themeColor.dark,
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/markdown': [...MARKDOWN_FILE_EXTENSIONS],
              ...DOCUMENT_MIME_EXTENSIONS,
            },
          },
        ],
        launch_handler: {
          client_mode: 'navigate-existing',
        },
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    // CodeMirror 扩展依赖 instanceof 检查，必须解析到同一份 state/view 模块。
    dedupe: codemirrorPackages,
    alias: [
      { find: 'decode-named-character-reference', replacement: require.resolve('decode-named-character-reference') },
      { find: 'hast-util-from-html-isomorphic', replacement: require.resolve('hast-util-from-html-isomorphic') },
      // 只需要 CSS 内联，避免加载 Juice/Cheerio 的 Node 文件与网络 I/O 链。
      { find: /^juice$/, replacement: require.resolve('juice/client') },
      { find: /^cheerio$/, replacement: createRequire(require.resolve('juice/package.json')).resolve('cheerio/slim') },
    ],
  },
  optimizeDeps: {
    include: [...codemirrorPackages, ...dynamicOptimizeDeps],
    exclude: ['@firecrawl/anydoc-wasm'],
  },
  worker: {
    format: 'es',
  },
})

export default config
