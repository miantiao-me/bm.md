import { cjkRegion } from './fonts'

function valueEnd(css: string, start: number): number {
  let quote = ''
  let parentheses = 0
  for (let index = start; index < css.length; index++) {
    const character = css[index]
    if (quote) {
      if (character === '\\')
        index++
      else if (character === quote)
        quote = ''
      continue
    }
    if (character === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      if (end < 0)
        return css.length
      index = end + 1
      continue
    }
    if (character === '"' || character === '\'') {
      quote = character
      continue
    }
    if (character === '(')
      parentheses++
    else if (character === ')')
      parentheses = Math.max(0, parentheses - 1)
    else if (parentheses === 0 && (character === ';' || character === '}'))
      return index
  }
  return css.length
}

function sanitizeValue(value: string): string {
  let result = ''
  let quote = ''
  let parentheses = 0
  for (let index = 0; index < value.length;) {
    const character = value[index]
    if (quote) {
      result += character
      if (character === '\\' && index + 1 < value.length) {
        result += value[index + 1]
        index += 2
        continue
      }
      if (character === quote)
        quote = ''
      index++
      continue
    }
    if (character === '/' && value[index + 1] === '*') {
      const commentEnd = value.indexOf('*/', index + 2)
      const end = commentEnd < 0 ? value.length : commentEnd + 2
      result += value.slice(index, end)
      index = end
      continue
    }
    if (character === '"' || character === '\'') {
      quote = character
      result += character
      index++
      continue
    }
    if (character === '(') {
      parentheses++
      result += character
      index++
      continue
    }
    if (character === ')') {
      parentheses = Math.max(0, parentheses - 1)
      result += character
      index++
      continue
    }
    if (parentheses === 0 && /[a-z-]/i.test(character)) {
      let end = index + 1
      while (end < value.length && /[a-z-]/i.test(value[end]))
        end++
      const token = value.slice(index, end)
      result += /^(?:auto|scroll)$/i.test(token) ? 'visible' : token
      index = end
      continue
    }
    result += character
    index++
  }
  return result
}

export function sanitizeCss(css: string): string {
  let result = ''
  let cursor = 0
  let quote = ''
  let parentheses = 0
  for (let index = 0; index < css.length; index++) {
    const character = css[index]
    if (quote) {
      if (character === '\\')
        index++
      else if (character === quote)
        quote = ''
      continue
    }
    if (character === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      if (end < 0)
        break
      index = end + 1
      continue
    }
    if (character === '"' || character === '\'') {
      quote = character
      continue
    }
    if (character === '(') {
      parentheses++
      continue
    }
    if (character === ')') {
      parentheses = Math.max(0, parentheses - 1)
      continue
    }
    if (character !== ':' || parentheses > 0)
      continue

    const boundary = Math.max(css.lastIndexOf('{', index), css.lastIndexOf('}', index), css.lastIndexOf(';', index))
    // 注释可合法地出现在声明前，或属性名与冒号之间。
    const property = css.slice(boundary + 1, index).replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase()
    if (property !== 'overflow' && property !== 'overflow-x' && property !== 'overflow-y')
      continue
    const end = valueEnd(css, index + 1)
    result += css.slice(cursor, index + 1)
    result += sanitizeValue(css.slice(index + 1, end))
    cursor = end
    index = end - 1
  }
  return result + css.slice(cursor)
}

export function selectBackgroundColor(colors: string[]): string {
  return colors.find((color) => {
    const value = color.trim().toLowerCase()
    return value
      && value !== 'transparent'
      && !/^#[0-9a-f]{6}00$/.test(value)
      && !/^(?:rgb|hsl)a?\([^)]*[/,]\s*0(?:\.0+)?%?\s*\)$/.test(value)
  }) ?? '#ffffff'
}

function fontStack(serif: boolean, region: 'SC' | 'TC' | 'JP' | 'KR'): string {
  const style = serif ? 'Serif' : 'Sans'
  return `"Noto ${style} ${region}", "Noto Color Emoji", "Noto Emoji", ${serif ? 'serif' : 'sans-serif'}`
}

function codeFontStack(region: 'SC' | 'TC' | 'JP' | 'KR'): string {
  return `"Noto Sans Mono", "Noto Sans ${region}", "Noto Color Emoji", "Noto Emoji", monospace`
}

export function createPdfStyles(serif: boolean, lang = 'zh-CN'): string {
  const bodyFamily = fontStack(serif, cjkRegion(lang))
  return `
#bm-md, #bm-md p, #bm-md li, #bm-md blockquote, #bm-md table,
#bm-md h1, #bm-md h2, #bm-md h3, #bm-md h4, #bm-md h5, #bm-md h6 {
  font-family: ${bodyFamily} !important;
}
#bm-md:lang(zh-CN), #bm-md:lang(zh-Hans), #bm-md :lang(zh-CN), #bm-md :lang(zh-Hans) {
  font-family: ${fontStack(serif, 'SC')} !important;
}
#bm-md:lang(zh-TW), #bm-md:lang(zh-Hant), #bm-md:lang(zh-HK),
#bm-md :lang(zh-TW), #bm-md :lang(zh-Hant), #bm-md :lang(zh-HK) {
  font-family: ${fontStack(serif, 'TC')} !important;
}
#bm-md:lang(ja), #bm-md :lang(ja) { font-family: ${fontStack(serif, 'JP')} !important; }
#bm-md:lang(ko), #bm-md :lang(ko) { font-family: ${fontStack(serif, 'KR')} !important; }
#bm-md pre, #bm-md code, #bm-md kbd, #bm-md samp {
  font-family: ${codeFontStack(cjkRegion(lang))} !important;
}
#bm-md pre:lang(zh-CN), #bm-md code:lang(zh-CN), #bm-md pre :lang(zh-CN), #bm-md code :lang(zh-CN) {
  font-family: ${codeFontStack('SC')} !important;
}
#bm-md pre:lang(zh-TW), #bm-md pre:lang(zh-Hant), #bm-md code:lang(zh-TW), #bm-md code:lang(zh-Hant),
#bm-md pre :lang(zh-TW), #bm-md pre :lang(zh-Hant), #bm-md code :lang(zh-TW), #bm-md code :lang(zh-Hant) {
  font-family: ${codeFontStack('TC')} !important;
}
#bm-md pre:lang(ja), #bm-md code:lang(ja), #bm-md pre :lang(ja), #bm-md code :lang(ja) {
  font-family: ${codeFontStack('JP')} !important;
}
#bm-md pre:lang(ko), #bm-md code:lang(ko), #bm-md pre :lang(ko), #bm-md code :lang(ko) {
  font-family: ${codeFontStack('KR')} !important;
}
#bm-md {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  line-height: ${serif ? 1.78 : 1.72};
}
#bm-md h1, #bm-md h2, #bm-md h3, #bm-md h4, #bm-md h5, #bm-md h6 { line-height: 1.35; }
#bm-md h1 { margin-top: 1.6em; margin-bottom: 0.72em; }
#bm-md h2 { margin-top: 1.45em; margin-bottom: 0.64em; }
#bm-md h3 { margin-top: 1.3em; margin-bottom: 0.56em; }
#bm-md h4, #bm-md h5, #bm-md h6 { margin-top: 1.15em; margin-bottom: 0.48em; }
#bm-md > h1:first-child, #bm-md > h2:first-child, #bm-md > h3:first-child,
#bm-md > h4:first-child, #bm-md > h5:first-child, #bm-md > h6:first-child { margin-top: 0; }
#bm-md p { margin-bottom: 0.9em; }
#bm-md p, #bm-md li { orphans: 3; widows: 3; }
#bm-md ul, #bm-md ol { margin-bottom: 0.9em; }
#bm-md li { margin-bottom: 0.3em; }
#bm-md li > ul, #bm-md li > ol { margin-top: 0.28em; margin-bottom: 0.28em; }
#bm-md blockquote, #bm-md pre, #bm-md table, #bm-md figure,
#bm-md picture, #bm-md .markdown-alert, #bm-md .math-display, #bm-md details {
  margin-top: 1.15em;
  margin-bottom: 1.15em;
}
#bm-md blockquote, #bm-md .markdown-alert { box-decoration-break: clone; }
#bm-md pre, #bm-md pre code { line-height: 1.55; }
#bm-md pre { max-width: 100%; overflow-x: visible; white-space: pre-wrap; overflow-wrap: break-word; }
#bm-md table { width: 100%; max-width: 100%; overflow-x: visible; }
#bm-md pre, #bm-md figure.figure-image, #bm-md picture, #bm-md img,
#bm-md svg, #bm-md .markdown-alert, #bm-md .math-display, #bm-md details { break-inside: avoid; }
#bm-md tr { break-inside: avoid; }
#bm-md hr { margin-top: 1.4em; margin-bottom: 1.4em; break-inside: avoid; }
#bm-md img, #bm-md svg { max-width: 100%; height: auto; }
`.trim()
}
