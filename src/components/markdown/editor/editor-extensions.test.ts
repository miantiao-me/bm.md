import type { LanguageSupport } from '@codemirror/language'
import { markdownLanguage } from '@codemirror/lang-markdown'
import { LanguageDescription } from '@codemirror/language'
import { getStyleTags, tags } from '@lezer/highlight'
import { describe, expect, it } from 'vitest'
import { createEditorExtensions, editorCodeLanguages } from './editor-extensions'

function markdownSupport() {
  const support = createEditorExtensions([])[0] as LanguageSupport
  return support
}

function markdownParser() {
  return markdownSupport().language.parser
}

function offsetOf(document: string, text: string, occurrence = 0) {
  let offset = -1
  for (let index = 0; index <= occurrence; index++) {
    offset = document.indexOf(text, offset + 1)
  }
  expect(offset).toBeGreaterThanOrEqual(0)
  return offset
}

function hasHighlightTag(node: Parameters<typeof getStyleTags>[0], tag: typeof tags.keyword) {
  return getStyleTags(node)?.tags.some(candidate => candidate.set.includes(tag)) ?? false
}

describe('编辑器代码围栏语言', () => {
  it('在 mermaid 围栏内使用 Mermaid 语法高亮标签', () => {
    const document = [
      '```mermaid',
      'flowchart TD',
      '  A[Start] --> B[End]',
      '```',
    ].join('\n')
    const tree = markdownParser().parse(document)

    const diagramName = tree.resolveInner(offsetOf(document, 'flowchart'), 1)
    const nodeText = tree.resolveInner(offsetOf(document, 'Start'), 1)
    const link = tree.resolveInner(offsetOf(document, '-->'), 1)

    expect(diagramName.name).toBe('DiagramName')
    expect(hasHighlightTag(diagramName, tags.typeName)).toBe(true)
    expect(nodeText.name).toBe('NodeText')
    expect(hasHighlightTag(nodeText, tags.string)).toBe(true)
    expect(hasHighlightTag(link, tags.contentSeparator)).toBe(true)
  })

  it('在 infographic 围栏内区分关键字、属性、字符串和注释', () => {
    const document = [
      '```infographic',
      'infographic bar',
      'theme default',
      'data',
      '  title "Sales"',
      '  value 85',
      '# comment',
      '```',
    ].join('\n')
    const tree = markdownParser().parse(document)

    const declaration = tree.resolveInner(offsetOf(document, 'infographic', 1), 1)
    const chartType = tree.resolveInner(offsetOf(document, 'bar'), 1)
    const property = tree.resolveInner(offsetOf(document, 'title'), 1)
    const string = tree.resolveInner(offsetOf(document, '"Sales"'), 1)
    const value = tree.resolveInner(offsetOf(document, '85'), 1)
    const comment = tree.resolveInner(offsetOf(document, '# comment'), 1)

    expect(declaration.name).toBe('keyword')
    expect(hasHighlightTag(declaration, tags.keyword)).toBe(true)
    expect(chartType.name).toBe('typeName')
    expect(hasHighlightTag(chartType, tags.typeName)).toBe(true)
    expect(property.name).toBe('propertyName')
    expect(hasHighlightTag(property, tags.propertyName)).toBe(true)
    expect(string.name).toBe('string')
    expect(hasHighlightTag(string, tags.string)).toBe(true)
    expect(getStyleTags(value)).toBeNull()
    expect(comment.name).toBe('comment')
    expect(hasHighlightTag(comment, tags.comment)).toBe(true)
  })

  it('保留普通语言匹配，并让未知语言继续使用 Markdown 回退', () => {
    const javascript = editorCodeLanguages.find(language => language.name.toLowerCase() === 'javascript')
    const matchedJavascript = LanguageDescription.matchLanguageName(editorCodeLanguages, 'javascript', true)
    const unknown = LanguageDescription.matchLanguageName(editorCodeLanguages, 'not-a-language', true)
    const document = '```not-a-language\nconst value = 1\n```'
    const tree = markdownParser().parse(document)

    expect(javascript).toBeDefined()
    expect(matchedJavascript).toBe(javascript)
    expect(unknown).toBeNull()
    expect(tree.resolveInner(offsetOf(document, 'const'), 1).name).toBe('CodeText')
  })

  it('使用标准 Markdown 语言作为编辑器基础', () => {
    expect(markdownSupport().language.name).toBe(markdownLanguage.name)
  })
})
