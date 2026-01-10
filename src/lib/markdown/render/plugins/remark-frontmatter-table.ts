import type { PhrasingContent, Root, RootContent, Table, TableCell, TableRow } from 'mdast'
import type { Plugin } from 'unified'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import { parse as parseToml } from 'smol-toml'
import { parse as parseYaml } from 'yaml'

const remarkFrontmatterTable: Plugin<[], Root> = () => {
  return (tree) => {
    const newChildren: RootContent[] = []

    for (const node of tree.children) {
      const nodeType = node.type as string

      if (nodeType !== 'yaml' && nodeType !== 'toml') {
        newChildren.push(node)
        continue
      }

      const frontmatterValue = (node as unknown as { value: string }).value

      let data: Record<string, unknown>
      try {
        data = nodeType === 'toml'
          ? parseToml(frontmatterValue) as Record<string, unknown>
          : parseYaml(frontmatterValue) as Record<string, unknown>
      }
      catch {
        newChildren.push(node)
        continue
      }

      if (!data || typeof data !== 'object') {
        newChildren.push(node)
        continue
      }

      const rows: TableRow[] = Object.entries(data).map(([key, value]) => {
        const valueStr = formatValue(value)
        const valueChildren = parseInlineMarkdown(valueStr)

        const keyCell: TableCell = {
          type: 'tableCell',
          children: [{ type: 'text', value: key }],
          data: { hProperties: { className: ['frontmatter-key'] } },
        }

        const valueCell: TableCell = {
          type: 'tableCell',
          children: valueChildren as PhrasingContent[],
          data: { hProperties: { className: ['frontmatter-value'] } },
        }

        return {
          type: 'tableRow',
          children: [keyCell, valueCell],
        } as TableRow
      })

      const tableNode: Table = {
        type: 'table',
        children: rows,
        data: { hProperties: { className: ['frontmatter-table'] } },
      }

      newChildren.push(tableNode)
    }

    tree.children = newChildren
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(v => formatValue(v)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function parseInlineMarkdown(text: string) {
  try {
    const tree = fromMarkdown(text, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    })

    if (tree.children.length === 1 && tree.children[0].type === 'paragraph') {
      return tree.children[0].children
    }

    return tree.children
  }
  catch {
    return [{ type: 'text' as const, value: text }]
  }
}

export default remarkFrontmatterTable
