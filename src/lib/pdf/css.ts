import type { PdfTypography } from './fonts'
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

function languageSelectors(tags: string[], elements: string[]): string {
  return tags.flatMap(tag => elements.map(element => `#bm-md ${element}:lang(${tag})`)).join(', ')
}

export function createPdfStyles(typography: PdfTypography, lang = 'zh-CN'): string {
  const region = cjkRegion(lang)
  const bodyFamily = fontStack(typography.bodySerif, region)
  const headingSerif = typography.headingSerif ?? typography.bodySerif
  const headingFamily = fontStack(headingSerif, region)
  const bodyElements = ['p', 'li', 'blockquote', 'table']
  const headingElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  const codeElements = ['pre', 'code', 'kbd', 'samp']
  const languageRules = [
    { tags: ['zh-CN', 'zh-Hans'], region: 'SC' as const },
    { tags: ['zh-TW', 'zh-Hant', 'zh-HK'], region: 'TC' as const },
    { tags: ['ja'], region: 'JP' as const },
    { tags: ['ko'], region: 'KR' as const },
  ].flatMap(rule => [
    `${languageSelectors(rule.tags, bodyElements)} {\n  font-family: ${fontStack(typography.bodySerif, rule.region)} !important;\n}`,
    `${languageSelectors(rule.tags, headingElements)} {\n  font-family: ${fontStack(headingSerif, rule.region)} !important;\n}`,
    `${languageSelectors(rule.tags, codeElements)} {\n  font-family: ${codeFontStack(rule.region)} !important;\n}`,
  ]).join('\n')
  // 只固定字体并保证 A4 版心与分页/折行；垂直节奏全部交给主题样式表。
  return `
#bm-md, #bm-md p, #bm-md li, #bm-md blockquote, #bm-md table {
  font-family: ${bodyFamily} !important;
}
#bm-md h1, #bm-md h2, #bm-md h3, #bm-md h4, #bm-md h5, #bm-md h6 {
  font-family: ${headingFamily} !important;
}
${languageRules}
#bm-md pre, #bm-md code, #bm-md kbd, #bm-md samp {
  font-family: ${codeFontStack(region)} !important;
}
#bm-md {
  padding: 0;
}
#bm-md p, #bm-md li { orphans: 3; widows: 3; }
#bm-md blockquote, #bm-md .markdown-alert { box-decoration-break: clone; }
#bm-md pre { overflow-x: visible; white-space: pre-wrap; overflow-wrap: break-word; }
#bm-md table { width: 100%; max-width: 100%; overflow-x: visible; }
#bm-md pre, #bm-md figure.figure-image, #bm-md picture, #bm-md img,
#bm-md svg, #bm-md .markdown-alert, #bm-md .math-display, #bm-md details { break-inside: avoid; }
#bm-md tr { break-inside: avoid; }
#bm-md hr { break-inside: avoid; }
#bm-md img, #bm-md svg { max-width: 100%; height: auto; }
#bm-md img.bm-pdf-katex-inline, #bm-md img.bm-pdf-katex-display {
  padding: 0 !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  height: auto !important;
}
#bm-md img.bm-pdf-svg-diagram {
  padding: 0 !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  height: auto !important;
}
#bm-md img.bm-pdf-katex-inline {
  display: inline-block !important;
  max-width: 100% !important;
  margin: 0 !important;
}
#bm-md img.bm-pdf-katex-display {
  display: block !important;
  max-width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
  break-inside: avoid;
}
`.trim()
}
