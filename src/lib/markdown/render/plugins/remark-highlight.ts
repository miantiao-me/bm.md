import type { Data, Parent, PhrasingContent, Root } from 'mdast'
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import type { Code, Event, Extension, Resolver, Token, TokenizeContext, Tokenizer } from 'micromark-util-types'
import type { Plugin } from 'unified'
import { splice } from 'micromark-util-chunked'
import { classifyCharacter } from 'micromark-util-classify-character'
import { resolveAll } from 'micromark-util-resolve-all'
import { codes, constants, types } from 'micromark-util-symbol'

export interface Highlight extends Parent {
  type: 'highlight'
  children: PhrasingContent[]
  data: Data & { hName: 'mark' }
}

declare module 'mdast' {
  interface PhrasingContentMap {
    highlight: Highlight
  }

  interface RootContentMap {
    highlight: Highlight
  }
}

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    highlight: 'highlight'
    highlightSequence: 'highlightSequence'
    highlightSequenceTemporary: 'highlightSequenceTemporary'
    highlightText: 'highlightText'
  }
}

const highlightScopes = new WeakSet<TokenizeContext>()
const initializedParsers = new WeakSet<TokenizeContext['parser']>()

function findHighlightOpen(events: Event[], close: number) {
  // 只在同一作用域寻找 opener，避免跨越容器或链接、图片 label 配对。
  let depth = 0
  for (let index = close - 1; index >= 0; index--) {
    const [kind, token] = events[index]
    if (kind === 'exit') {
      if (depth === 0 && token.type === 'highlightSequenceTemporary' && token._open)
        return index
      depth++
    }
    else if (--depth < 0 || (depth === 0 && (token.type === types.labelLink || token.type === types.labelImage))) {
      return -1
    }
  }
  return -1
}

function resolveHighlightPair(events: Event[], context: TokenizeContext, open: number, index: number): void {
  events[index][1].type = 'highlightSequence'
  events[open][1].type = 'highlightSequence'
  const highlight: Token = { type: 'highlight', start: { ...events[open][1].start }, end: { ...events[index][1].end } }
  const text: Token = { type: 'highlightText', start: { ...events[open][1].end }, end: { ...events[index][1].start } }
  const nextEvents: Event[] = [
    ['enter', highlight, context],
    ['enter', events[open][1], context],
    ['exit', events[open][1], context],
    ['enter', text, context],
  ]
  const nested = highlightScopes.has(context)
  highlightScopes.add(context)
  try {
    splice(nextEvents, nextEvents.length, 0, resolveAll(context.parser.constructs.insideSpan.null || [], events.slice(open + 1, index), context))
  }
  finally {
    if (!nested)
      highlightScopes.delete(context)
  }
  splice(nextEvents, nextEvents.length, 0, [
    ['exit', text, context],
    ['enter', events[index][1], context],
    ['exit', events[index][1], context],
    ['exit', highlight, context],
  ])
  splice(events, open - 1, index - open + 3, nextEvents)
}

const resolveUnmatchedHighlight: Resolver = (events) => {
  let index = -1

  while (++index < events.length) {
    if (events[index][1].type === 'highlightSequenceTemporary')
      events[index][1].type = types.data
  }

  return events
}

const boundaryCoordinator = { resolveAll: resolveSpanBoundaries }

const tokenizeHighlight: Tokenizer = function (effects, ok, nok) {
  if (!initializedParsers.has(this.parser)) {
    const hooks = this.parser.constructs.insideSpan.null
    const index = hooks?.indexOf(boundaryCoordinator) ?? -1
    // 扩展合并后先协调边界，再让强调和删除线 resolver 消费分隔符。
    if (hooks && index > 0) {
      hooks.splice(index, 1)
      hooks.unshift(boundaryCoordinator)
    }
    initializedParsers.add(this.parser)
  }
  const markers = this.parser.constructs.attentionMarkers.null || []
  const classify = (code: Code) => markers.includes(code) ? constants.characterGroupPunctuation : classifyCharacter(code)
  // 只对已登记的强调、删除线标记放宽正文贴邻；不包含高亮自身的等号。
  const isFormatMarker = (code: Code) => (code === codes.asterisk || code === codes.underscore || code === codes.tilde) && markers.includes(code)
  const previous = this.previous
  const events = this.events
  const previousIsFormatMarker = isFormatMarker(previous) && events.at(-1)?.[1].type !== types.characterEscape
  let size = 0

  return start

  function start(code: Code) {
    if (code !== codes.equalsTo || (previous === codes.equalsTo && events[events.length - 1][1].type !== types.characterEscape))
      return nok(code)

    effects.enter('highlightSequenceTemporary')
    return more(code)
  }

  function more(code: Code) {
    const before = classify(previous)

    if (code === codes.equalsTo) {
      if (size > 1)
        return nok(code)
      effects.consume(code)
      size++
      return more
    }

    if (size !== 2)
      return nok(code)

    const token = effects.exit('highlightSequenceTemporary')
    const after = classify(code)
    token._open = !after || (after === constants.characterGroupPunctuation && Boolean(before)) || isFormatMarker(code)
    token._close = !before || (before === constants.characterGroupPunctuation && Boolean(after)) || previousIsFormatMarker
    return ok(code)
  }
}

const resolveToHighlight: Resolver = (events, context) => {
  const close = events.at(-1)?.[1]
  if (close?.type !== 'highlightSequenceTemporary' || !close._close)
    return events

  const index = events.length - 2
  const open = findHighlightOpen(events, index)
  if (open >= 0)
    resolveHighlightPair(events, context, open, index)
  return events
}

function resolveSpanBoundaries(events: Event[], context: TokenizeContext) {
  if (!highlightScopes.has(context) && !events.some(event => event[1].type === 'highlight'))
    return events
  const first = events[0]?.[1]
  const last = events.at(-1)?.[1]
  if (!first || !last)
    return events
  for (const token of new Set([first, last])) {
    const underscore = token.type === 'attentionSequence' && context.sliceSerialize(token).startsWith('_')
    if (!underscore && token.type !== 'strikethroughSequenceTemporary')
      continue
    const beforeText = context.sliceSerialize({ start: first.start, end: token.start })
    const afterText = context.sliceSerialize({ start: token.end, end: last.end })
    const before = token === first ? constants.characterGroupPunctuation : classifyCharacter(Array.from(beforeText.slice(-2)).at(-1)?.codePointAt(0) ?? null)
    const after = token === last ? constants.characterGroupPunctuation : classifyCharacter(afterText.codePointAt(0) ?? null)
    const open = !after || (after === constants.characterGroupPunctuation && Boolean(before))
    const close = !before || (before === constants.characterGroupPunctuation && Boolean(after))
    token._open = open && (!underscore || !close || before === constants.characterGroupPunctuation)
    token._close = close && (!underscore || !open || after === constants.characterGroupPunctuation)
  }
  return events
}

function highlightSyntax(): Extension {
  const tokenizer = {
    name: 'highlight',
    tokenize: tokenizeHighlight,
    resolveTo: resolveToHighlight,
    resolveAll: resolveUnmatchedHighlight,
  }

  return {
    text: { [codes.equalsTo]: tokenizer },
    insideSpan: { null: [boundaryCoordinator, tokenizer] },
    attentionMarkers: { null: [codes.equalsTo] },
  }
}

function highlightFromMarkdown(): FromMarkdownExtension {
  return {
    canContainEols: ['highlight'],
    enter: {
      highlight(this: CompileContext, token: Token) {
        this.enter({ type: 'highlight', children: [], data: { hName: 'mark' } }, token)
      },
    },
    exit: {
      highlight(this: CompileContext, token: Token) {
        this.exit(token)
      },
    },
  }
}

const remarkHighlight: Plugin<[], Root> = function () {
  const data = this.data()
  const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])

  micromarkExtensions.push(highlightSyntax())
  fromMarkdownExtensions.push(highlightFromMarkdown())
}

export default remarkHighlight
