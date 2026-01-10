import type { Plugin } from 'vite'
import { minify } from 'html-minifier-terser'

export function htmlRawMinifyPlugin(): Plugin {
  return {
    name: 'html-raw-minify',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.html?raw')) {
        return
      }

      const exportDefaultMatch = code.match(/^export default ("[\s\S]*")/m)
      if (!exportDefaultMatch) {
        return
      }

      const html = JSON.parse(exportDefaultMatch[1])
      const minified = await minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeAttributeQuotes: false,
      })

      return {
        code: `export default ${JSON.stringify(minified)}`,
        map: null,
      }
    },
  }
}
