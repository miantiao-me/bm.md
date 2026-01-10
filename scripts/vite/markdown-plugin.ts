import type { Plugin } from 'vite'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

export function markdownPlugin(): Plugin {
  return {
    name: 'markdown-html',
    async transform(code, id) {
      if (!id.endsWith('.md'))
        return

      const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeExternalLinks, {
          target: '_blank',
          rel: ['noopener'],
        })
        .use(rehypeStringify)
        .process(code)

      return {
        code: `export default ${JSON.stringify(String(result))}`,
        map: null,
      }
    },
  }
}
