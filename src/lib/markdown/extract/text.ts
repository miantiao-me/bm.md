import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRetext from 'remark-retext'
import retextEnglish from 'retext-english'
import retextStringify from 'retext-stringify'
import { unified } from 'unified'
import remarkHighlight from '../render/plugins/remark-highlight'

const processor = unified()
  .use(remarkParse)
  .use(remarkHighlight)
  .use(remarkGfm)
  .use(remarkRetext, unified().use(retextEnglish))
  .use(retextStringify)

export async function extract(markdown: string) {
  const processed = await processor.process(markdown)
  return processed.toString()
}
