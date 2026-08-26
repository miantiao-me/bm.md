import type { Element, ElementContent, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'

import { phrasing } from 'hast-util-phrasing'
import { whitespace } from 'hast-util-whitespace'
import { getClassList } from '@/lib/markdown/hast'

type TaskMarker = '☑' | '☐'

function readInteger(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isInteger(number) ? number : fallback
}

function isInlineContent(node: RootContent): boolean {
  if (node.type !== 'element') {
    return true
  }
  return phrasing(node) || node.tagName === 'strike' || node.tagName === 'tt'
}

function trimBoundaryWhitespace(children: ElementContent[]): ElementContent[] {
  let start = 0
  let end = children.length
  while (start < end && whitespace(children[start])) start++
  while (end > start && whitespace(children[end - 1])) end--
  return children.slice(start, end)
}

function consumeTaskMarker(item: Element): TaskMarker | undefined {
  if (!getClassList(item).includes('task-list-item')) {
    return
  }

  const firstIndex = item.children.findIndex(child => !whitespace(child))
  const first = item.children[firstIndex]
  const container = first?.type === 'element' && first.tagName === 'p' ? first : item
  const checkboxIndex = container.children.findIndex(child => !whitespace(child))
  const checkbox = container.children[checkboxIndex]
  if (checkbox?.type !== 'element' || checkbox.tagName !== 'input' || checkbox.properties?.type !== 'checkbox') {
    return
  }

  const checked = checkbox.properties.checked === true
    || checkbox.properties.checked === ''
    || checkbox.properties.checked === 'checked'
  container.children.splice(checkboxIndex, 1)
  const next = container.children[checkboxIndex]
  if (next?.type === 'text' && next.value.startsWith(' ')) {
    next.value = next.value.slice(1)
  }
  return checked ? '☑' : '☐'
}

function createItemMarker(ordered: boolean, ordinal: number, taskMarker: TaskMarker | undefined): string {
  if (ordered) {
    return `${ordinal}. ${taskMarker ? `${taskMarker} ` : ''}`
  }
  return taskMarker ? `${taskMarker} ` : '• '
}

function createTextLine(children: ElementContent[], marker: string | undefined, listDepth: number): Element {
  const prefix = marker === undefined
    ? '\u00A0\u00A0'.repeat(listDepth)
    : `${'\u00A0\u00A0'.repeat(listDepth - 1)}${marker}`
  const textIndent = marker === undefined ? '0' : '-2em'
  const paddingStyle = `padding-left: ${listDepth * 2}em;`
  const indentStyle = `text-indent: ${textIndent};`
  const style = paddingStyle.concat(' ', indentStyle)

  return {
    type: 'element',
    tagName: 'section',
    properties: { style },
    children: [{ type: 'text', value: prefix }, ...children],
  }
}

function replaceListsIn(parent: Root | Element, nextListDepth: number): void {
  const children: RootContent[] = []
  for (const child of parent.children) {
    if (child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')) {
      children.push(...flattenList(child, nextListDepth))
    }
    else if (child.type === 'element' && child.tagName === 'li') {
      const taskMarker = consumeTaskMarker(child)
      children.push(...flattenListItem(child, createItemMarker(false, 1, taskMarker), nextListDepth))
    }
    else {
      if (child.type === 'element') {
        replaceListsIn(child, nextListDepth)
      }
      children.push(child)
    }
  }
  if (parent.type === 'root') {
    parent.children = children
  }
  else {
    // Element 的原始 children 不含 doctype，列表替换也只生成 ElementContent。
    parent.children = children as ElementContent[]
  }
}

function flattenList(list: Element, listDepth: number): ElementContent[] {
  const ordered = list.tagName === 'ol'
  let ordinal = ordered ? readInteger(list.properties?.start, 1) : 1
  const children: ElementContent[] = []

  for (const child of list.children) {
    if (child.type !== 'element' || child.tagName !== 'li') {
      continue
    }
    if (ordered) {
      ordinal = readInteger(child.properties?.value, ordinal)
    }
    const taskMarker = consumeTaskMarker(child)
    children.push(...flattenListItem(child, createItemMarker(ordered, ordinal, taskMarker), listDepth))
    if (ordered) {
      ordinal++
    }
  }

  return children
}

function flattenListItem(item: Element, marker: string, listDepth: number): ElementContent[] {
  const children: ElementContent[] = []
  const taskItem = getClassList(item).includes('task-list-item')
  const hasNestedList = item.children.some(child => child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol'))
  const hasOwnContent = item.children.some((child) => {
    if (whitespace(child)) {
      return false
    }
    if (child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')) {
      return false
    }
    if (child.type === 'element' && child.tagName === 'p') {
      return trimBoundaryWhitespace(child.children).length > 0
    }
    return true
  })
  let markerEmitted = false
  let inline: ElementContent[] = []

  const flushInline = () => {
    const content = trimBoundaryWhitespace(inline)
    inline = []
    if (content.length === 0) {
      return
    }
    children.push(createTextLine(content, markerEmitted ? undefined : marker, listDepth))
    markerEmitted = true
  }

  for (const child of item.children) {
    if (child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')) {
      flushInline()
      if (!markerEmitted && (hasOwnContent || taskItem)) {
        children.push(createTextLine([], marker, listDepth))
        markerEmitted = true
      }
      children.push(...flattenList(child, listDepth + 1))
      continue
    }

    if (isInlineContent(child)) {
      if (child.type === 'element') {
        replaceListsIn(child, listDepth + 1)
      }
      inline.push(child)
      continue
    }

    flushInline()
    if (child.type === 'element') {
      replaceListsIn(child, listDepth + 1)
      if (child.tagName === 'p') {
        const content = trimBoundaryWhitespace(child.children)
        if (content.length > 0) {
          children.push(createTextLine(content, markerEmitted ? undefined : marker, listDepth))
          markerEmitted = true
        }
      }
      else {
        if (!markerEmitted) {
          children.push(createTextLine([], marker, listDepth))
          markerEmitted = true
        }
        children.push(child)
      }
    }
    else {
      inline.push(child)
    }
  }
  flushInline()
  if (!markerEmitted && !hasNestedList) {
    children.push(createTextLine([], marker, listDepth))
  }

  return children
}

export const rehypeWechatList: Plugin<[], Root> = () => tree => replaceListsIn(tree, 1)
