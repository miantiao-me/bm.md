import type { GlyphReplacement, PdfRenderInput } from './protocol'
import { uniqBy } from 'es-toolkit'
import { normalizeGoogleFontsMirrorUrl } from '../google-fonts'
import { cjkRegion, mappedFontFamilies } from './font-map'
import { PdfError } from './protocol'

export { cjkRegion, googleFontFamily } from './font-map'

export const FONT_PROBE_ATTRIBUTE = 'data-bm-pdf-font-probe'
export const MISSING_GLYPH_REPLACEMENT = '□'

const DEFAULT_GRAPHEME_SEGMENTER: Pick<Intl.Segmenter, 'segment'> | null = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null

export interface FontCacheStorage {
  open: (name: string) => Promise<{
    match: (request: string) => Promise<Response | undefined>
    put: (request: string, response: Response) => Promise<void>
  }>
}

export class FontUnavailableError extends Error {
  readonly code = 'FONT_UNAVAILABLE'
}

export function hasEmoji(text: string): boolean {
  return text.includes('\uFE0F')
    || /\p{Extended_Pictographic}/u.test(text)
    || /[\u2190-\u27BF]/u.test(text)
}

export interface FontUsage {
  fontFamily: string
  fontWeight: number
  italic: boolean
  lang?: string
}

export function collectFontUsages(usages: FontUsage[], lang: string): FontUsage[] {
  const result = new Map<string, FontUsage>()
  for (const usage of usages) {
    for (const fontFamily of mappedFontFamilies(usage.fontFamily, usage.lang || lang)) {
      const entry = { fontFamily, fontWeight: usage.fontWeight || 400, italic: usage.italic }
      result.set(`${fontFamily}:${entry.fontWeight}:${entry.italic}`, entry)
    }
  }
  return [...result.values()]
}

export function selectFontFamilies(selection: {
  lang: string
  languages: string[]
  text: string
  fontUsages: FontUsage[]
  usesCode: boolean
}): string[] {
  const usages = selection.fontUsages.length
    ? selection.fontUsages
    : collectFontUsages([
        { fontFamily: 'sans-serif', fontWeight: 400, italic: false },
      ], selection.lang)
  const families = new Set(usages.map(usage => usage.fontFamily))
  const regions = new Set(selection.languages.map(cjkRegion))
  if (/[\u3041-\u30FF\u31F0-\u31FF]/.test(selection.text))
    regions.add('JP')
  if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(selection.text))
    regions.add('KR')
  const kinds = new Set([...families].flatMap(family => family.match(/^Noto (Serif|Sans) (SC|TC|JP|KR)$/)?.[1] ?? []))
  for (const region of regions) {
    for (const kind of kinds)
      families.add(`Noto ${kind} ${region}`)
  }
  if (selection.usesCode)
    families.add('Fira Mono')
  return [...families]
}

export function createCachedFontFetch(
  cacheStorage: FontCacheStorage,
  networkFetch: (input: string, init?: RequestInit) => Promise<Response>,
): (input: string, init?: RequestInit) => Promise<Response> {
  const pending = new Map<string, Promise<Response>>()
  return async (input, init) => {
    if ((init?.method?.toUpperCase() ?? 'GET') !== 'GET')
      throw new FontUnavailableError('字体服务不可用')
    let mirrorUrl: string
    try {
      mirrorUrl = normalizeGoogleFontsMirrorUrl(input)
    }
    catch (error) {
      throw new FontUnavailableError('字体服务不可用', { cause: error })
    }

    let cache: Awaited<ReturnType<FontCacheStorage['open']>> | undefined
    try {
      cache = await cacheStorage.open('bm.md.pdf-fonts-v1')
      const cached = await cache.match(mirrorUrl)
      if (cached)
        return cached.clone()
    }
    catch {
      cache = undefined
    }

    let request = pending.get(mirrorUrl)
    if (!request) {
      request = networkFetch(mirrorUrl, init)
        .then(async (response) => {
          if (!response.ok)
            throw new FontUnavailableError('字体服务不可用')
          try {
            await cache?.put(mirrorUrl, response.clone())
          }
          catch {
            // 字体缓存只是离线优化。
          }
          return response
        })
        .catch((error) => {
          if (error instanceof FontUnavailableError)
            throw error
          throw new FontUnavailableError('字体服务不可用', { cause: error })
        })
        .finally(() => pending.delete(mirrorUrl))
      pending.set(mirrorUrl, request)
    }
    return (await request).clone()
  }
}

export function isFontUnavailable(error: unknown): boolean {
  if (error instanceof FontUnavailableError)
    return true
  const message = error instanceof Error ? error.message : String(error)
  return /missing glyph|no fonts? registered|font fallback|字体服务不可用/i.test(message)
}

export function missingGlyphs(error: unknown): number[] {
  const message = error instanceof Error ? error.message : String(error)
  const codepoints = new Set<number>()
  for (const match of message.matchAll(/\(U\+([0-9A-F]{4,6})\)/gi))
    codepoints.add(Number.parseInt(match[1], 16))
  return [...codepoints]
}

export function replaceGraphemes(
  text: string,
  missing: ReadonlySet<number>,
  segmenter: Pick<Intl.Segmenter, 'segment'> | null = DEFAULT_GRAPHEME_SEGMENTER,
): { replacements: GlyphReplacement[], text: string } {
  if (!segmenter)
    throw new PdfError('renderFailed', '当前浏览器无法安全处理缺失字符，请使用打印功能')
  const replacements: GlyphReplacement[] = []
  const replaced = [...segmenter.segment(text)].map(({ segment }) => {
    const codepoints = Array.from(segment, character => character.codePointAt(0)!)
    if (!codepoints.some(codepoint => missing.has(codepoint)))
      return segment
    replacements.push({ codepoints, original: segment })
    return MISSING_GLYPH_REPLACEMENT
  }).join('')
  return { replacements, text: replaced }
}

export function generatedProbe(codepoints: number[], lang: string): {
  fontFamily: string
  fontFamilies: string[]
  text: string
} {
  const region = cjkRegion(lang)
  const text = String.fromCodePoint(...codepoints)
  const emoji = hasEmoji(text) ? ['Noto Color Emoji', 'Noto Emoji'] : []
  return {
    fontFamily: [`"Fira Mono"`, `"Noto Sans ${region}"`, '"Noto Sans Math"', '"Noto Sans Symbols 2"', ...emoji.map(name => `"${name}"`), '"bm.md Fallback"', 'monospace'].join(', '),
    fontFamilies: ['Fira Mono', `Noto Sans ${region}`, 'Noto Sans Math', 'Noto Sans Symbols 2', ...emoji],
    text,
  }
}

export function recoverMissingGlyphs(
  input: PdfRenderInput,
  codepoints: number[],
  probed: ReadonlySet<number>,
): { input: PdfRenderInput, probed: number[], replacements: GlyphReplacement[] } {
  const document = new DOMParser().parseFromString(input.html, 'text/html')
  const unprobed = codepoints.filter(codepoint => !probed.has(codepoint))
  if (unprobed.length) {
    const root = document.querySelector('#bm-md')
    if (!root)
      throw new PdfError('renderFailed', '预览内容无法生成 PDF，请刷新后重试')
    const probe = generatedProbe(unprobed, input.lang)
    const element = document.createElement('span')
    element.setAttribute(FONT_PROBE_ATTRIBUTE, 'generated-content')
    element.setAttribute('style', `position:absolute;opacity:0;font-size:1px;font-family:${probe.fontFamily}`)
    element.textContent = probe.text
    root.append(element)
    input.fontFamilies = [...new Set([...input.fontFamilies, ...probe.fontFamilies])]
    input.html = document.body.innerHTML
    return { input, probed: unprobed, replacements: [] }
  }
  const missing = new Set(codepoints)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const replacements: GlyphReplacement[] = []
  let node = walker.nextNode()
  while (node) {
    if (!node.parentElement?.closest(`style, script, noscript, [${FONT_PROBE_ATTRIBUTE}]`)) {
      const result = replaceGraphemes(node.nodeValue ?? '', missing)
      node.nodeValue = result.text
      replacements.push(...result.replacements)
    }
    node = walker.nextNode()
  }

  document.querySelectorAll(`[${FONT_PROBE_ATTRIBUTE}]`).forEach(element => element.remove())
  const replaced = new Set(replacements.flatMap(item => item.codepoints))
  const unresolved = codepoints.filter(codepoint => !replaced.has(codepoint))
  if (unresolved.some(codepoint => probed.has(codepoint)))
    throw new PdfError('renderFailed', '部分字符无法生成 PDF，请使用打印功能')

  const root = document.querySelector('#bm-md')
  if (unresolved.length > 0) {
    if (!root)
      throw new PdfError('renderFailed', '预览内容无法生成 PDF，请刷新后重试')
    const probe = generatedProbe(unresolved, input.lang)
    const element = document.createElement('span')
    element.setAttribute(FONT_PROBE_ATTRIBUTE, 'generated-content')
    element.setAttribute('aria-hidden', 'true')
    element.setAttribute('style', `position:absolute;opacity:0;color:transparent;font-size:1px;line-height:1;font-family:${probe.fontFamily}`)
    element.textContent = probe.text
    root.append(element)
    input.fontFamilies = [...new Set([...input.fontFamilies, ...probe.fontFamilies])]
  }
  input.html = document.body.innerHTML
  return { input, probed: unresolved, replacements }
}

export function replacementSummary(replacements: GlyphReplacement[]): string {
  const unique = uniqBy(replacements, item => item.original)
  return unique.slice(0, 6).map(item => (
    `${item.original} (${item.codepoints.map(codepoint => `U+${codepoint.toString(16).toUpperCase()}`).join(' ')})`
  )).join('、')
}
