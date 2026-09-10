import type { StateCommand, Transaction } from '@codemirror/state'
import { historyField, insertNewlineAndIndent, redo, undo, undoDepth } from '@codemirror/commands'
import { insertNewlineContinueMarkup, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  completeMarkdownFence,
  markdownCommandKeymap,
  toggleMarkdownBold,
  toggleMarkdownItalic,
} from './markdown-commands'

const markdownLanguageExtensions = markdownLanguage.extension as unknown as readonly unknown[]
const markdownLanguageProvider = markdownLanguageExtensions[0] as {
  facet: { extensions?: readonly unknown[] }
}
// Vitest 不走应用的 CodeMirror dedupe；这里只保留同步语法树字段，避免引入 DOM 解析 worker。
const parserStateField = markdownLanguageProvider.facet.extensions?.find(extension => extension && typeof extension === 'object' && extension.constructor.name === 'StateField')
if (parserStateField)
  markdownLanguageProvider.facet.extensions = [parserStateField]

function createState(
  doc: string,
  selection: EditorSelection | { anchor: number, head?: number } = { anchor: 0 },
  readOnly = false,
) {
  return EditorState.create({
    doc,
    selection,
    extensions: [
      markdownLanguage.extension,
      historyField,
      EditorState.allowMultipleSelections.of(true),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    ],
  })
}

function run(command: StateCommand, state: EditorState) {
  let next = state
  const handled = command({
    state,
    dispatch(transaction) {
      next = transaction.state
    },
  })
  return { handled, state: next }
}

function runKey(key: string, state: EditorState, composing = false, compositionStarted = false) {
  const binding = markdownCommandKeymap.find(candidate => candidate.key === key)
  expect(binding?.run).toBeTypeOf('function')
  let next = state
  const handled = binding?.run?.({
    state,
    composing,
    compositionStarted,
    dispatch(transaction: Transaction) {
      next = transaction.state
    },
  } as unknown as import('@codemirror/view').EditorView)
  return { handled, state: next }
}

describe('markdown 轻量格式命令', () => {
  it('用 Mod-b 包裹非空选区，并保留反向选区方向', () => {
    const state = createState('abcdefghi', { anchor: 7, head: 2 })
    const result = run(toggleMarkdownBold, state)

    expect(result.handled).toBe(true)
    expect(result.state.doc.toString()).toBe('ab**cdefg**hi')
    expect(result.state.selection.main.anchor).toBe(9)
    expect(result.state.selection.main.head).toBe(4)
  })

  it('用 Mod-i 包裹空选区，光标落在成对标记之间且可单次撤销', () => {
    const state = createState('text', { anchor: 2 })
    const result = run(toggleMarkdownItalic, state)

    expect(result.state.doc.toString()).toBe('te**xt')
    expect(result.state.selection.main.from).toBe(3)
    expect(result.state.selection.main.to).toBe(3)
    expect(undoDepth(result.state)).toBe(1)

    const undone = run(undo, result.state)
    expect(undone.handled).toBe(true)
    expect(undone.state.doc.toString()).toBe('text')
    expect(undoDepth(undone.state)).toBe(0)
  })

  it('空文档中的空选区也能开始可撤销的格式输入', () => {
    const result = run(toggleMarkdownBold, createState('', { anchor: 0 }))

    expect(result.handled).toBe(true)
    expect(result.state.doc.toString()).toBe('****')
    expect(result.state.selection.main.head).toBe(2)
  })

  it('支持多选区，并分别保留每个选区的方向', () => {
    const selection = EditorSelection.create([
      EditorSelection.range(3, 0),
      EditorSelection.range(13, 8),
    ], 1)
    const state = createState('one two three', selection)
    const result = run(toggleMarkdownBold, state)

    expect(result.state.doc.toString()).toBe('**one** two **three**')
    expect(result.state.selection.ranges.map(range => [range.anchor, range.head])).toEqual([
      [5, 2],
      [19, 14],
    ])
    expect(result.state.selection.mainIndex).toBe(1)
    expect(undoDepth(result.state)).toBe(1)
  })

  it.each([
    ['**bold**', 6, 2, 'bold'],
    ['__bold__', 6, 2, 'bold'],
  ])('按 Mod-b 取消已有粗体：%s', (doc, anchor, head, expected) => {
    const result = run(toggleMarkdownBold, createState(doc, { anchor, head }))

    expect(result.state.doc.toString()).toBe(expected)
    expect(result.state.selection.main.anchor).toBe(4)
    expect(result.state.selection.main.head).toBe(0)
  })

  it.each([
    ['*italic*', 7, 1, 'italic'],
    ['_italic_', 7, 1, 'italic'],
  ])('按 Mod-i 取消已有斜体：%s', (doc, anchor, head, expected) => {
    const result = run(toggleMarkdownItalic, createState(doc, { anchor, head }))

    expect(result.state.doc.toString()).toBe(expected)
    expect(result.state.selection.main.anchor).toBe(6)
    expect(result.state.selection.main.head).toBe(0)
  })

  it('不把词内下划线误认为斜体，也不在部分标记边界强行转换', () => {
    const plain = run(toggleMarkdownItalic, createState('foo_bar_baz', { anchor: 11, head: 0 }))
    const partial = run(toggleMarkdownBold, createState('**bold**', { anchor: 5, head: 3 }))

    expect(plain.state.doc.toString()).toBe('*foo_bar_baz*')
    expect(partial.handled).toBe(false)
    expect(partial.state.doc.toString()).toBe('**bold**')
  })

  it('在行内代码、未闭合围栏代码及其内容中保持不变', () => {
    const inline = createState('a `code` b', { anchor: 5 })
    const fencedDoc = '```\ncode\n'
    const fenced = createState(fencedDoc, { anchor: fencedDoc.indexOf('code') + 2 })
    const selectedCode = createState('a `code` b', { anchor: 7, head: 2 })
    const closedFenceDoc = '```\ncode\n```'
    const fenceOpening = createState(closedFenceDoc, { anchor: 0 })
    const fenceClosing = createState(closedFenceDoc, { anchor: closedFenceDoc.length })

    expect(run(toggleMarkdownBold, inline).handled).toBe(false)
    expect(run(toggleMarkdownItalic, fenced).handled).toBe(false)
    expect(run(toggleMarkdownBold, selectedCode).handled).toBe(false)
    expect(run(toggleMarkdownBold, fenceOpening).handled).toBe(false)
    expect(run(toggleMarkdownBold, fenceClosing).handled).toBe(false)
  })

  it('不在 Markdown 注释块的空行插入格式标记', () => {
    const doc = '<!--\n\n-->'
    const result = run(toggleMarkdownBold, createState(doc, { anchor: 5 }))

    expect(result.handled).toBe(false)
    expect(result.state.doc.toString()).toBe(doc)
  })

  it('只读状态和 IME composing 时不抢占快捷键', () => {
    const readOnly = createState('text', { anchor: 0, head: 4 }, true)
    const composing = createState('text', { anchor: 0, head: 4 })

    expect(run(toggleMarkdownBold, readOnly).handled).toBe(false)
    expect(runKey('Mod-b', composing, true).handled).toBe(false)
    expect(runKey('Mod-i', composing, false, true).handled).toBe(false)
    expect(composing.doc.toString()).toBe('text')
  })

  it('格式操作作为一个历史事件，并可重做', () => {
    const state = createState('text', { anchor: 0, head: 4 })
    const formatted = run(toggleMarkdownBold, state).state
    const undone = run(undo, formatted).state
    const redone = run(redo, undone).state

    expect(formatted.doc.toString()).toBe('**text**')
    expect(undone.doc.toString()).toBe('text')
    expect(redone.doc.toString()).toBe('**text**')
  })
})

describe('markdown 围栏 Enter 命令', () => {
  it.each([
    ['```', '```\n\n```'],
    ['```ts', '```ts\n\n```'],
    ['~~~', '~~~\n\n~~~'],
  ])('只在孤立未闭合围栏后补全：%s', (doc, expected) => {
    const result = run(completeMarkdownFence, createState(doc, { anchor: doc.length }))

    expect(result.handled).toBe(true)
    expect(result.state.doc.toString()).toBe(expected)
    expect(result.state.selection.main.head).toBe(doc.length + 1)
  })

  it('在已经有 closer、已有代码内容、关闭围栏或引用列表中不补全', () => {
    const cases = [
      ['```\n\n```', 3],
      ['```\ncode', '```\ncode'.length],
      ['```\ncode\n```', '```\ncode\n```'.length],
      ['> ```', 5],
      ['- ```', 5],
    ] as const

    for (const [doc, position] of cases) {
      const result = run(completeMarkdownFence, createState(doc, { anchor: position }))
      expect(result.handled, doc).toBe(false)
      expect(result.state.doc.toString(), doc).toBe(doc)
    }
  })

  it('空的首个代码行可补全，但不会把后续代码移动到 closer 外', () => {
    const emptyLine = createState('```\n', { anchor: 4 })
    const withContent = createState('```\n\ncode', { anchor: 4 })

    expect(run(completeMarkdownFence, emptyLine).state.doc.toString()).toBe('```\n\n```')
    expect(run(completeMarkdownFence, withContent).handled).toBe(false)
  })

  it('自定义 Enter 返回 false 时保留官方 Markdown/标准 Enter 行为', () => {
    const state = createState('> quote', { anchor: 7 })
    const custom = runKey('Enter', state)
    expect(custom.handled).toBe(false)

    let next = state
    expect(insertNewlineContinueMarkup({
      state,
      dispatch(transaction) {
        next = transaction.state
      },
    })).toBe(true)
    expect(next.doc.toString()).toBe('> quote\n> ')

    const plain = createState('text', { anchor: 4 })
    let plainNext = plain
    expect(insertNewlineContinueMarkup({
      state: plain,
      dispatch(transaction) {
        plainNext = transaction.state
      },
    })).toBe(false)
    expect(insertNewlineAndIndent({
      state: plainNext,
      dispatch(transaction) {
        plainNext = transaction.state
      },
    })).toBe(true)
    expect(plainNext.doc.toString()).toBe('text\n')
  })

  it('围栏补全也只产生一个可撤销历史事件', () => {
    const doc = '```'
    const result = run(completeMarkdownFence, createState(doc, { anchor: doc.length }))
    expect(undoDepth(result.state)).toBe(1)

    const undone = run(undo, result.state)
    expect(undone.state.doc.toString()).toBe(doc)
  })
})

describe('markdown 快捷键边界', () => {
  it('不注册 Tab，避免改变焦点导航', () => {
    expect(markdownCommandKeymap.some(binding => binding.key === 'Tab' || binding.key === 'Shift-Tab')).toBe(false)
  })

  it('只读 Enter 不修改文档', () => {
    const state = createState('```', { anchor: 3 }, true)
    const result = runKey('Enter', state)

    expect(result.handled).toBe(false)
    expect(result.state.doc.toString()).toBe('```')
  })
})
