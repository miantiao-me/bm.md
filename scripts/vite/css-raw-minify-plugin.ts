import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import { transform } from 'lightningcss'

export function cssRawMinifyPlugin(): Plugin {
  return {
    name: 'css-raw-minify',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css?raw'))
        return

      // Vite 已将内容转换为 export default "..."，需要提取原始 CSS
      const match = code.match(/^export default "([\s\S]*)"/m)
      if (!match)
        return

      // 解码转义字符
      const css = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')

      const { code: minified } = transform({
        filename: id.replace('?raw', ''),
        code: Buffer.from(css),
        minify: true,
      })

      return {
        code: `export default ${JSON.stringify(minified.toString())}`,
        map: null,
      }
    },
  }
}
