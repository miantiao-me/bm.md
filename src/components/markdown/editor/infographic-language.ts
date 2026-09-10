import type { StreamParser } from '@codemirror/language'
import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language'

interface InfographicState {
  afterDecl: boolean
  inValue: boolean
}

const infographicParser: StreamParser<InfographicState> = {
  name: 'infographic',

  startState() {
    return { afterDecl: false, inValue: false }
  },

  copyState(state) {
    return { afterDecl: state.afterDecl, inValue: state.inValue }
  },

  token(stream, state) {
    if (stream.sol()) {
      state.afterDecl = false
      state.inValue = false
    }

    if (stream.eatSpace()) {
      return null
    }

    if (stream.match(/#.*$/) !== null) {
      state.afterDecl = false
      state.inValue = false
      return 'comment'
    }

    const character = stream.peek()
    if (character === '"' || character === '\'') {
      state.afterDecl = false
      state.inValue = false
      const quote = character
      stream.next()

      while (!stream.eol()) {
        if (stream.peek() === '\\') {
          stream.next()
          if (!stream.eol()) {
            stream.next()
          }
          continue
        }

        const current = stream.next()
        if (current === quote) {
          break
        }
      }

      return 'string'
    }

    // 属性名之后的普通值保持默认色，避免把 DSL 内容误判为语法。
    if (state.inValue) {
      state.inValue = false
      stream.skipToEnd()
      return null
    }

    if (state.afterDecl) {
      state.afterDecl = false
      if (stream.match(/\S+/) !== null) {
        return 'typeName'
      }
      return null
    }

    if (stream.match(/infographic\b/) !== null) {
      state.afterDecl = true
      stream.match(/\s+/)
      return 'keyword'
    }

    if (stream.match(/(theme|template)\b/) !== null) {
      stream.match(/\s+/)
      state.inValue = true
      return 'keyword'
    }

    if (stream.match(/^(data|design)\s*$/) !== null) {
      return 'keyword'
    }

    if (stream.match(/-\s*/) !== null) {
      if (stream.match(/\S+/) !== null) {
        stream.match(/\s+/)
        state.inValue = true
        return 'propertyName'
      }
      return null
    }

    if (stream.match(/\S+/) !== null) {
      stream.match(/\s+/)
      state.inValue = true
      return 'propertyName'
    }

    return null
  },
}

export const infographicLanguage = StreamLanguage.define(infographicParser)
export const infographicLanguageSupport = new LanguageSupport(infographicLanguage)
export const infographicLanguageDescription = LanguageDescription.of({
  name: 'infographic',
  support: infographicLanguageSupport,
})
