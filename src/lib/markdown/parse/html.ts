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

export default async function parse(html: string) {
  const processed = await processor.process(html)
  return processed.toString()
}
