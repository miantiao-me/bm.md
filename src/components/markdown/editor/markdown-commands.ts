import type { EditorState, StateCommand } from '@codemirror/state'
import type { Command, KeyBinding } from '@codemirror/view'
import type { MarkdownFormat } from './markdown-format-commands'
import { isolateHistory } from '@codemirror/commands'
import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language'
import { Prec, Transaction } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { buildMarkdownFenceChange } from './markdown-fence-command'
import { buildMarkdownFormatChange } from './markdown-format-commands'

type CommandTarget = Parameters<StateCommand>[0]
type ChangeResult = ReturnType<EditorState['changeByRange']>
type MarkdownTree = ReturnType<typeof syntaxTree>

function parseThroughSelections(state: EditorState): MarkdownTree | null {
  const upto = state.selection.ranges.reduce((max, range) => {
    const line = state.doc.lineAt(range.to)
    return Math.max(max, line.to < state.doc.length ? line.to + 1 : line.to)
  }, 0)

  return syntaxTreeAvailable(state, upto) ? syntaxTree(state) : null
}

function applyMarkdownChange(target: CommandTarget, result: ChangeResult, userEvent: string) {
  if (result.changes.empty)
    return false

  target.dispatch(target.state.update({
    changes: result.changes,
    selection: result.selection,
    effects: result.effects,
    annotations: [
      isolateHistory.of('full'),
      Transaction.userEvent.of(userEvent),
    ],
  }))
  return true
}

function runFormatCommand(target: CommandTarget, format: MarkdownFormat) {
  if (target.state.readOnly)
    return false
  const tree = parseThroughSelections(target.state)
  if (!tree)
    return false
  return applyMarkdownChange(target, buildMarkdownFormatChange(target.state, tree, format), 'input.format')
}

export const toggleMarkdownBold: StateCommand = target => runFormatCommand(target, 'bold')
export const toggleMarkdownItalic: StateCommand = target => runFormatCommand(target, 'italic')

export const completeMarkdownFence: StateCommand = (target) => {
  if (target.state.readOnly)
    return false
  const tree = parseThroughSelections(target.state)
  if (!tree)
    return false
  return applyMarkdownChange(target, buildMarkdownFenceChange(target.state, tree), 'input.completeFence')
}

function guardComposition(command: StateCommand): Command {
  return view => view.composing || view.compositionStarted
    ? false
    // @codemirror/view 当前携带了另一份 state 类型，但运行时对象结构相同。
    : command(view as unknown as Parameters<StateCommand>[0])
}

export const markdownCommandKeymap: readonly KeyBinding[] = [
  { key: 'Mod-b', run: guardComposition(toggleMarkdownBold) },
  { key: 'Mod-i', run: guardComposition(toggleMarkdownItalic) },
  { key: 'Enter', run: guardComposition(completeMarkdownFence) },
]

export const markdownCommandExtension = Prec.highest(keymap.of(markdownCommandKeymap))
