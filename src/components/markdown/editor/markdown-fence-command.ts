import type { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { EditorSelection } from '@codemirror/state'

type MarkdownTree = ReturnType<typeof syntaxTree>
type SyntaxNode = MarkdownTree['topNode']

interface FenceCompletion {
  at: number
  insert: string
  cursor: number
}

function enclosingFence(tree: MarkdownTree, pos: number) {
  for (const side of [-1, 0, 1] as const) {
    let node: SyntaxNode | null = tree.resolveInner(pos, side)
    while (node) {
      if (node.name === 'FencedCode')
        return node
      node = node.parent
    }
  }
  return null
}

function fenceCompletion(state: EditorState, tree: MarkdownTree, pos: number): FenceCompletion | null {
  const fence = enclosingFence(tree, pos)
  if (!fence || fence.parent?.name !== 'Document')
    return null

  const marks = fence.getChildren('CodeMark')
  const opening = marks[0]
  if (!opening || marks.length !== 1)
    return null

  const openingLine = state.doc.lineAt(opening.from)
  const prefix = state.sliceDoc(openingLine.from, opening.from)
  if (prefix.length > 3 || prefix.trim() !== '')
    return null

  const body = state.sliceDoc(openingLine.to)
  if (body.trim() !== '')
    return null

  const marker = state.sliceDoc(opening.from, opening.to)
  const currentLine = state.doc.lineAt(pos)
  const hasLineBreakAfterOpening = openingLine.to < state.doc.length

  if (currentLine.number === openingLine.number && pos === currentLine.to && !hasLineBreakAfterOpening) {
    return {
      at: pos,
      insert: `${state.lineBreak}${state.lineBreak}${prefix}${marker}`,
      cursor: pos + state.lineBreak.length,
    }
  }

  if (currentLine.number !== openingLine.number + 1 || pos !== currentLine.from || currentLine.text !== '' || !hasLineBreakAfterOpening)
    return null

  return {
    at: pos,
    insert: `${state.lineBreak}${prefix}${marker}`,
    cursor: pos + state.lineBreak.length,
  }
}

export function buildMarkdownFenceChange(state: EditorState, tree: MarkdownTree) {
  return state.changeByRange((range) => {
    if (!range.empty)
      return { range }
    const completion = fenceCompletion(state, tree, range.from)
    if (!completion)
      return { range }
    return {
      changes: { from: completion.at, insert: completion.insert },
      range: EditorSelection.cursor(completion.cursor),
    }
  })
}
