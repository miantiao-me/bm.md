import type { syntaxTree } from '@codemirror/language'
import type { ChangeSpec, EditorState, SelectionRange } from '@codemirror/state'
import { EditorSelection } from '@codemirror/state'

type MarkdownTree = ReturnType<typeof syntaxTree>
type SyntaxNode = MarkdownTree['topNode']
export type MarkdownFormat = 'bold' | 'italic'

const formatNodeNames: Record<MarkdownFormat, string> = {
  bold: 'StrongEmphasis',
  italic: 'Emphasis',
}
const formatNodeNameSet = new Set(Object.values(formatNodeNames))

const inlineContainerNames = new Set(['Paragraph', 'TableCell'])
const unsafeNodeNames = new Set([
  'ATXHeadingMark',
  'CodeInfo',
  'CodeMark',
  'CodeText',
  'CommentBlock',
  'EmphasisMark',
  'HardBreak',
  'HTMLTag',
  'LinkMark',
  'ListMark',
  'QuoteMark',
  'SetextHeadingMark',
  'URL',
])

const codeNodeNames = new Set(['FencedCode', 'InlineCode'])

interface MarkerPair {
  open: SyntaxNode
  close: SyntaxNode
}

interface FormatMatch {
  node: SyntaxNode
  pair: MarkerPair
}

interface CodeRange {
  from: number
  to: number
  fenced: boolean
}

function sameNode(left: SyntaxNode, right: SyntaxNode) {
  return left.name === right.name && left.from === right.from && left.to === right.to
}

function ancestors(node: SyntaxNode) {
  const result: SyntaxNode[] = []
  for (let current: SyntaxNode | null = node; current; current = current.parent)
    result.push(current)
  return result
}

function isInlineContainer(node: SyntaxNode) {
  return inlineContainerNames.has(node.name)
    || node.name.startsWith('ATXHeading')
    || node.name.startsWith('SetextHeading')
}

function inlineContainerAt(tree: MarkdownTree, pos: number) {
  for (const side of [0, -1, 1] as const) {
    const container = ancestors(tree.resolveInner(pos, side)).find(isInlineContainer)
    if (container)
      return container
  }
  return null
}

function inlineContainerForRange(tree: MarkdownTree, from: number, to: number) {
  const left = ancestors(tree.resolveInner(from, 1))
  const right = ancestors(tree.resolveInner(Math.max(from, to - 1), -1))
  return left.find(candidate => isInlineContainer(candidate)
    && candidate.from <= from
    && candidate.to >= to
    && right.some(node => sameNode(candidate, node))) ?? null
}

function markerPair(node: SyntaxNode, format: MarkdownFormat): MarkerPair | null {
  if (node.name !== formatNodeNames[format])
    return null

  const marks = node.getChildren('EmphasisMark')
  const open = marks[0]
  const close = marks.at(-1)
  const expectedLength = format === 'bold' ? 2 : 1
  if (!open || !close || open === close || open.from !== node.from || close.to !== node.to)
    return null
  if (open.to - open.from !== expectedLength || close.to - close.from !== expectedLength)
    return null
  return { open, close }
}

function formatNodeAtRange(tree: MarkdownTree, range: SelectionRange, format: MarkdownFormat) {
  const candidates: FormatMatch[] = []
  tree.iterate({
    enter: (ref) => {
      if (ref.name !== formatNodeNames[format])
        return
      const node = ref.node
      const pair = markerPair(node, format)
      if (!pair)
        return
      const matchesContent = range.from === pair.open.to && range.to === pair.close.from
      const matchesNode = range.from === node.from && range.to === node.to
      if (matchesContent || matchesNode)
        candidates.push({ node, pair })
    },
  })
  candidates.sort((left, right) => (left.node.to - left.node.from) - (right.node.to - right.node.from))
  return candidates[0] ?? null
}

function formatNodeAtCursor(tree: MarkdownTree, pos: number, format: MarkdownFormat) {
  const candidates: FormatMatch[] = []
  tree.iterate({
    enter: (ref) => {
      if (ref.name !== formatNodeNames[format])
        return
      const node = ref.node
      const pair = markerPair(node, format)
      if (pair && pos >= pair.open.to && pos <= pair.close.from)
        candidates.push({ node, pair })
    },
  })
  candidates.sort((left, right) => (left.node.to - left.node.from) - (right.node.to - right.node.from))
  return candidates[0] ?? null
}

function codeRanges(tree: MarkdownTree) {
  const ranges: CodeRange[] = []
  tree.iterate({
    enter: (ref) => {
      if (!codeNodeNames.has(ref.name))
        return
      const node = ref.node
      ranges.push({
        from: node.from,
        to: node.to,
        fenced: node.name === 'FencedCode',
      })
      return false
    },
  })
  return ranges
}

function isInCode(range: SelectionRange, ranges: CodeRange[]) {
  return ranges.some((code) => {
    if (!range.empty)
      return range.from < code.to && range.to > code.from

    const inside = range.from > code.from && range.from < code.to
    const atFenceBoundary = code.fenced && (range.from === code.from || range.from === code.to)
    return inside || atFenceBoundary
  })
}

function hasUnsafeAncestor(tree: MarkdownTree, pos: number) {
  return ancestors(tree.resolveInner(pos, 0)).some(node => unsafeNodeNames.has(node.name))
}

function touchesUnsafeNode(tree: MarkdownTree, from: number, to: number) {
  let unsafe = false
  tree.iterate({
    from,
    to,
    enter: (ref) => {
      if (ref.from >= to || ref.to <= from)
        return
      if (unsafeNodeNames.has(ref.name)) {
        unsafe = true
        return false
      }
    },
  })
  return unsafe
}

function touchesFormattingNode(tree: MarkdownTree, from: number, to: number) {
  let formatting = false
  tree.iterate({
    from,
    to,
    enter: (ref) => {
      if (!formatNodeNameSet.has(ref.name) || ref.from >= to || ref.to <= from)
        return
      formatting = true
      return false
    },
  })
  return formatting
}

function directedRange(range: SelectionRange, from: number, to: number) {
  return range.anchor <= range.head
    ? EditorSelection.range(from, to)
    : EditorSelection.range(to, from)
}

function wrapRange(range: SelectionRange, marker: string) {
  if (range.empty) {
    return {
      changes: { from: range.from, insert: `${marker}${marker}` },
      range: EditorSelection.cursor(range.from + marker.length),
    }
  }

  const changes: ChangeSpec[] = [
    { from: range.from, insert: marker },
    { from: range.to, insert: marker },
  ]
  return {
    changes,
    range: directedRange(range, range.from + marker.length, range.to + marker.length),
  }
}

function unwrapRange(range: SelectionRange, node: SyntaxNode, pair: MarkerPair) {
  const openLength = pair.open.to - pair.open.from
  const closeLength = pair.close.to - pair.close.from
  const contentFrom = node.from
  const contentTo = node.to - openLength - closeLength
  const changes: ChangeSpec[] = [
    { from: pair.open.from, to: pair.open.to },
    { from: pair.close.from, to: pair.close.to },
  ]

  if (range.empty) {
    return {
      changes,
      range: EditorSelection.cursor(range.from - openLength),
    }
  }

  return {
    changes,
    range: directedRange(range, contentFrom, contentTo),
  }
}

export function buildMarkdownFormatChange(state: EditorState, tree: MarkdownTree, format: MarkdownFormat) {
  const codes = codeRanges(tree)
  const marker = format === 'bold' ? '**' : '*'
  return state.changeByRange((range) => {
    if (isInCode(range, codes))
      return { range }

    const existing = range.empty
      ? formatNodeAtCursor(tree, range.from, format)
      : formatNodeAtRange(tree, range, format)
    if (existing)
      return unwrapRange(range, existing.node, existing.pair)

    if (range.empty) {
      const line = state.doc.lineAt(range.from)
      if ((!inlineContainerAt(tree, range.from) && line.text.trim() !== '') || hasUnsafeAncestor(tree, range.from))
        return { range }
      return wrapRange(range, marker)
    }

    if (!inlineContainerForRange(tree, range.from, range.to)
      || touchesUnsafeNode(tree, range.from, range.to)
      || touchesFormattingNode(tree, range.from, range.to)) {
      return { range }
    }
    return wrapRange(range, marker)
  })
}
