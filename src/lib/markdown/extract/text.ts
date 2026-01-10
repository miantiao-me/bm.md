import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRetext from 'remark-retext'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import { unified } from 'unified'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRetext, unified().use(retextEnglish))
  .use(retextStringify)

export default async function extract(markdown: string) {
  const processed = await processor.process(markdown)
  return processed.toString()
}
