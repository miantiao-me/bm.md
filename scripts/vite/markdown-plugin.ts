import type { Plugin } from 'vite'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import remarkHighlight from '../../src/lib/markdown/render/plugins/remark-highlight'
import remarkImageDimensions from '../../src/lib/markdown/render/plugins/remark-image-dimensions'
import { sanitizeSchema } from '../../src/lib/markdown/render/sanitize-schema'

export async function renderBuildMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkHighlight)
    .use(remarkImageDimensions)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener'],
    })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown)

  return String(result)
}

export function markdownPlugin(): Plugin {
  return {
    name: 'markdown-html',
    async transform(code, id) {
      if (!id.endsWith('.md'))
        return

      const result = await renderBuildMarkdown(code)

      return {
        code: `export default ${JSON.stringify(result)}`,
        map: null,
      }
    },
  }
}
