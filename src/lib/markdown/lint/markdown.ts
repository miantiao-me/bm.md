import { applyFixes } from 'markdownlint'
import { lint as lintAsync } from 'markdownlint/promise'

export async function lint(markdown: string) {
  const results = await lintAsync({ strings: { content: markdown } })
  return applyFixes(markdown, results.content)
}
