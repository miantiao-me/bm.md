import type { Data, Parent, PhrasingContent, Root } from 'mdast'
import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown'
import type { Code, Event, Extension, Resolver, Token, Tokenizer } from 'micromark-util-types'
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

const resolveAllHighlight: Resolver = (events, context) => {
  let index = -1

  while (++index < events.length) {
    if (events[index][0] !== 'enter' || events[index][1].type !== 'highlightSequenceTemporary' || !events[index][1]._close)
      continue

    let open = index
    while (open--) {
      if (events[open][0] !== 'exit' || events[open][1].type !== 'highlightSequenceTemporary' || !events[open][1]._open)
        continue

      events[index][1].type = 'highlightSequence'
      events[open][1].type = 'highlightSequence'

      const highlight: Token = {
        type: 'highlight',
        start: { ...events[open][1].start },
        end: { ...events[index][1].end },
      }
      const text: Token = {
        type: 'highlightText',
        start: { ...events[open][1].end },
        end: { ...events[index][1].start },
      }
      const nextEvents: Event[] = [
        ['enter', highlight, context],
        ['enter', events[open][1], context],
        ['exit', events[open][1], context],
        ['enter', text, context],
      ]
      const insideSpan = context.parser.constructs.insideSpan.null

      if (insideSpan)
        splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan, events.slice(open + 1, index), context))

      splice(nextEvents, nextEvents.length, 0, [
        ['exit', text, context],
        ['enter', events[index][1], context],
        ['exit', events[index][1], context],
        ['exit', highlight, context],
      ])
      splice(events, open - 1, index - open + 3, nextEvents)
      index = open + nextEvents.length - 2
      break
    }
  }

  index = -1
  while (++index < events.length) {
    if (events[index][1].type === 'highlightSequenceTemporary')
      events[index][1].type = types.data
  }

  return events
}

const tokenizeHighlight: Tokenizer = function (effects, ok, nok) {
  const previous = this.previous
  const events = this.events
  let size = 0

  return start

  function start(code: Code) {
    if (code !== codes.equalsTo || (previous === codes.equalsTo && events[events.length - 1][1].type !== types.characterEscape))
      return nok(code)

    effects.enter('highlightSequenceTemporary')
    return more(code)
  }

  function more(code: Code) {
    const before = classifyCharacter(previous)

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
    const after = classifyCharacter(code)
    token._open = !after || (after === constants.attentionSideAfter && Boolean(before))
    token._close = !before || (before === constants.attentionSideAfter && Boolean(after))
    return ok(code)
  }
}

function highlightSyntax(): Extension {
  const tokenizer = {
    name: 'highlight',
    tokenize: tokenizeHighlight,
    resolveAll: resolveAllHighlight,
  }

  return {
    text: { [codes.equalsTo]: tokenizer },
    insideSpan: { null: [tokenizer] },
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
