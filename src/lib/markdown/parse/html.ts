import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import rehypeSanitize from 'rehype-sanitize'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize)
  .use(rehypeRemark)
  .use(remarkStringify, {
    bullet: '-',
  })

export async function parse(html: string) {
  const cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  const processed = await processor.process(cleaned)
  return processed.toString()
}
