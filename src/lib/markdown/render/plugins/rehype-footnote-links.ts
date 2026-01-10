import type { Element, Root, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface FootnoteLink {
  id: number
  href: string
  text: string
}

const rehypeFootnoteLinks: Plugin<[], Root> = () => {
  return (tree) => {
    const links: FootnoteLink[] = []
    const seenUrls = new Set<string>()
    let counter = 1

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'a' || !node.properties?.href) {
        return
      }

      const href = String(node.properties.href)
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        return
      }

      if (seenUrls.has(href)) {
        const existingLink = links.find(l => l.href === href)
        if (existingLink && parent && typeof index === 'number') {
          const sup: Element = {
            type: 'element',
            tagName: 'sup',
            properties: { className: ['footnote-ref'] },
            children: [{ type: 'text', value: `[${existingLink.id}]` }],
          }
          parent.children.splice(index + 1, 0, sup)
        }
        return
      }

      const text = extractText(node)
      const id = counter++
      links.push({ id, href, text })
      seenUrls.add(href)

      if (parent && typeof index === 'number') {
        const sup: Element = {
          type: 'element',
          tagName: 'sup',
          properties: { className: ['footnote-ref'] },
          children: [{ type: 'text', value: `[${id}]` }],
        }
        parent.children.splice(index + 1, 0, sup)
      }
    })

    if (links.length === 0) {
      return
    }

    const footnoteSection: Element = {
      type: 'element',
      tagName: 'section',
      properties: { className: ['footnote-links'] },
      children: [
        {
          type: 'element',
          tagName: 'hr',
          properties: { className: ['footnote-divider'] },
          children: [],
        },
        {
          type: 'element',
          tagName: 'h4',
          properties: { className: ['footnote-title'] },
          children: [{ type: 'text', value: '参考链接' }],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: { className: ['footnote-list'] },
          children: links.map(link => ({
            type: 'element',
            tagName: 'li',
            properties: { className: ['footnote-item'] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['footnote-text'] },
                children: [{ type: 'text', value: link.text }],
              },
              { type: 'text', value: ': ' },
              {
                type: 'element',
                tagName: 'a',
                properties: { className: ['footnote-url'], href: link.href },
                children: [{ type: 'text', value: link.href }],
              },
            ],
          } as Element)),
        },
      ],
    }

    tree.children.push(footnoteSection)
  }
}

function extractText(node: Element): string {
  const texts: string[] = []

  function walk(n: Element | Text) {
    if (n.type === 'text') {
      texts.push(n.value)
    }
    else if (n.type === 'element' && n.children) {
      for (const child of n.children) {
        if (child.type === 'text' || child.type === 'element') {
          walk(child)
        }
      }
    }
  }

  walk(node)
  return texts.join('').trim() || node.properties?.href?.toString() || ''
}

export default rehypeFootnoteLinks
