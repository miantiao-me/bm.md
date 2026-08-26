import type { Element, Root } from 'hast'

import rehypeParse from 'rehype-parse'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'
import { getTextContent } from '@/lib/markdown/hast'
import { rehypeWechatList } from './rehype-wechat-list'

function transform(html: string, fragment = true): Root {
  const processor = unified()
    .use(rehypeParse, { fragment })
    .use(rehypeWechatList)
  return processor.runSync(processor.parse(html)) as Root
}

function elements(root: Root): Element[] {
  return root.children.filter((child): child is Element => child.type === 'element')
}

function texts(root: Root): string[] {
  return elements(root).map(node => getTextContent(node))
}

function expectNoNativeLists(root: Root): void {
  const tags: string[] = []
  const visit = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type === 'element') {
        tags.push(child.tagName)
        visit(child)
      }
    }
  }
  visit(root)
  expect(tags).not.toContain('ol')
  expect(tags).not.toContain('ul')
  expect(tags).not.toContain('li')
}

describe('rehypeWechatList', () => {
  it.each([
    ['前置嵌套', '<ul><li><ul><li>child</li></ul>after</li></ul>', ['• ', '\u00A0\u00A0• child', '\u00A0\u00A0after']],
    ['中间嵌套', '<ul><li>before<ul><li>child</li></ul>after</li></ul>', ['• before', '\u00A0\u00A0• child', '\u00A0\u00A0after']],
    ['尾部嵌套', '<ul><li>before<ul><li>child</li></ul></li></ul>', ['• before', '\u00A0\u00A0• child']],
  ])('keeps the parent marker before %s content', (_name, html, expected) => {
    const tree = transform(html)

    expect(texts(tree)).toEqual(expected)
    expectNoNativeLists(tree)
  })

  it('omits a parent marker when the item only contains a nested list', () => {
    const tree = transform('<ul><li>\n<ul><li>child</li></ul>\n</li></ul>')

    expect(texts(tree)).toEqual(['\u00A0\u00A0• child'])
  })

  it.each([
    ['empty', '<ul><li></li></ul>'],
    ['ASCII whitespace', '<ul><li> \n\t </li></ul>'],
  ])('emits a normal marker for an %s item', (_name, html) => {
    expect(texts(transform(html))).toEqual(['• '])
  })

  it('emits task markers for empty tasks and before task-only nested lists', () => {
    const empty = transform('<ul><li class="task-list-item"><input type="checkbox" checked></li><li class="task-list-item"> \n<input type="checkbox">\t</li></ul>')
    const nested = transform('<ul><li class="task-list-item"><input type="checkbox" checked><ul><li>child</li></ul></li></ul>')

    expect(texts(empty)).toEqual(['☑ ', '☐ '])
    expect(texts(nested)).toEqual(['☑ ', '\u00A0\u00A0• child'])
  })

  it('preserves NBSP as visible content', () => {
    const tree = transform('<ul><li>&nbsp;</li></ul>')

    expect(texts(tree)).toEqual(['• \u00A0'])
  })

  it('keeps phrasing content and semantic spaces on the marker line', () => {
    const tree = transform('<ul><li> <strong>a</strong> <em>b</em> <strike>c</strike> <tt>d</tt> </li></ul>')
    const line = elements(tree)[0]

    expect(getTextContent(line)).toBe('• a b c d')
    expect(line.children.filter(child => child.type === 'element').map(child => child.tagName))
      .toEqual(['strong', 'em', 'strike', 'tt'])
  })

  it('keeps comments in position within one text line', () => {
    const tree = transform('<ul><li>a<!--x-->b</li></ul>')
    const [line] = elements(tree)

    expect(elements(tree)).toHaveLength(1)
    expect(line.children.map(child => child.type)).toEqual(['text', 'text', 'comment', 'text'])
    expect(line.children[2]).toMatchObject({ type: 'comment', value: 'x' })
    expect(getTextContent(line)).toBe('• ab')
  })

  it('keeps blocks as siblings and degrades their nested lists at logical depth', () => {
    const tree = transform('<ul><li>outer<blockquote><ol start="2"><li>inner</li></ol></blockquote></li></ul>')
    const [line, quote] = elements(tree)
    const nested = quote.children.find((child): child is Element => child.type === 'element') as Element

    expect(line.tagName).toBe('section')
    expect(quote.tagName).toBe('blockquote')
    expect(nested.properties.style).toBe('padding-left: 4em; text-indent: -2em;')
    expect(getTextContent(nested)).toBe('\u00A0\u00A02. inner')
    expectNoNativeLists(tree)
  })

  it('emits an explicit marker line before a leading block', () => {
    const tree = transform('<ul><li><blockquote><p>quote</p></blockquote></li></ul>')
    const [marker, quote] = elements(tree)

    expect(marker.tagName).toBe('section')
    expect(getTextContent(marker)).toBe('• ')
    expect(quote.tagName).toBe('blockquote')
    expect(marker.children).toHaveLength(1)
  })

  it('supports ordered values, task markers, and ordinary checkboxes', () => {
    const tree = transform('<ol start="3"><li class="task-list-item"><input type="checkbox" checked>three</li><li class="task-list-item" value="7"><input type="checkbox">seven</li><li>eight</li></ol><ul><li><input type="checkbox" checked>raw</li></ul>')
    const [checked, unchecked, eight, raw] = elements(tree)

    expect(getTextContent(checked)).toBe('3. ☑ three')
    expect(getTextContent(unchecked)).toBe('7. ☐ seven')
    expect(getTextContent(eight)).toBe('8. eight')
    expect(getTextContent(raw)).toBe('• raw')
    expect(raw.children.some(child => child.type === 'element' && child.tagName === 'input')).toBe(true)
  })

  it('uses the task marker path for an orphan task item', () => {
    const tree = transform('<li class="task-list-item"><input type="checkbox" checked>done</li>')

    expect(texts(tree)).toEqual(['☑ done'])
  })

  it('preserves p, block, nested list, and continuation order', () => {
    const tree = transform('<ul><li><p>first</p><blockquote><p>quote</p><ul><li>nested</li></ul></blockquote>after</li></ul>')
    const [first, quote, after] = elements(tree)
    const quoteElements = quote.children.filter((child): child is Element => child.type === 'element')

    expect([first.tagName, quote.tagName, after.tagName]).toEqual(['section', 'blockquote', 'section'])
    expect(getTextContent(first)).toBe('• first')
    expect(quoteElements.map(child => child.tagName)).toEqual(['p', 'section'])
    expect(getTextContent(quoteElements[1])).toBe('\u00A0\u00A0• nested')
    expect(getTextContent(after)).toBe('\u00A0\u00A0after')
  })

  it('preserves root doctypes while replacing descendant lists', () => {
    const tree = transform('<!doctype html><html><body><ul><li>item</li></ul></body></html>', false)

    expect(tree.children[0].type).toBe('doctype')
    expectNoNativeLists(tree)
  })
})
