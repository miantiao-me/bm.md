import type { GoogleFontFamily } from '@takumi-rs/helpers'

export type CjkRegion = 'SC' | 'TC' | 'JP' | 'KR'
type FontKind = 'Serif' | 'Sans' | 'Mono'

export function cjkRegion(lang: string): CjkRegion {
  const normalized = lang.toLowerCase()
  if (normalized === 'ja' || normalized.startsWith('ja-'))
    return 'JP'
  if (normalized === 'ko' || normalized.startsWith('ko-'))
    return 'KR'
  if (normalized.includes('hant') || normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk'))
    return 'TC'
  return 'SC'
}

const aliases: Record<string, [string, FontKind]> = {}
for (const [names, family, kind] of [
  [['Georgia'], 'Gelasio', 'Serif'],
  [['Palatino Linotype', 'Palatino'], 'Literata', 'Serif'],
  [['Times New Roman', 'Times'], 'Tinos', 'Serif'],
  [['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'Helvetica', 'system-ui'], 'Inter', 'Sans'],
  [['Menlo', 'Consolas', 'Monaco', 'Courier New', 'monospace'], 'Fira Mono', 'Mono'],
  [['Songti SC', 'SimSun', 'STSong', 'Source Han Serif', 'Source Han Serif SC', 'Noto Serif CJK', 'Noto Serif CJK SC', 'serif'], 'Noto Serif', 'Serif'],
  [['PingFang SC', 'Microsoft YaHei', 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans CJK', 'Noto Sans CJK SC', 'sans-serif'], 'Noto Sans', 'Sans'],
] as const) {
  for (const name of names)
    aliases[name.toLowerCase()] = [family, kind]
}

export const EXTRA_FONT_FAMILIES = ['Noto Sans Math', 'Noto Sans Symbols 2', 'Noto Color Emoji', 'Noto Emoji']
export const FALLBACK_FONT_FAMILY = 'bm.md Fallback'

export function splitFontFamilies(value: string): string[] {
  return (value.replace(/\/\*[\s\S]*?\*\//g, '').match(/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,])+/g) ?? [])
    .map(name => name.trim().replace(/^(['"])(.*)\1$/, '$2'))
    .filter(Boolean)
}

function mapFamily(name: string, region: CjkRegion): [string, FontKind] | undefined {
  const lower = name.toLowerCase()
  const alias = aliases[lower]
  if (alias)
    return [alias[0].startsWith('Noto ') ? `${alias[0]} ${region}` : alias[0], alias[1]]
  const cjk = name.match(/^Noto (Serif|Sans) (SC|TC|JP|KR)$/i)
  if (cjk)
    return [`Noto ${cjk[1].toLowerCase() === 'serif' ? 'Serif' : 'Sans'} ${cjk[2].toUpperCase()}`, cjk[1].toLowerCase() === 'serif' ? 'Serif' : 'Sans']
  for (const [family, kind] of Object.values(aliases)) {
    if (lower === family.toLowerCase() && !family.startsWith('Noto '))
      return [family, kind]
  }
}

export function mappedFontFamilies(value: string, lang = 'zh-CN'): string[] {
  const mapped = splitFontFamilies(value).map(name => mapFamily(name, cjkRegion(lang))).filter(item => item !== undefined)
  const families = [...new Set(mapped.map(item => item[0]))]
  if (!families.some(name => /^Noto (?:Serif|Sans) (?:SC|TC|JP|KR)$/.test(name))) {
    const kind = mapped.find(item => item[1] !== 'Mono')?.[1] ?? 'Sans'
    // 等宽字体优先沿用栈内中文回退，其余栈按第一个可识别字体决定。
    const first = mapped[0]?.[1]
    families.push(`Noto ${first === 'Mono' ? kind : first ?? 'Sans'} ${cjkRegion(lang)}`)
  }
  return [...families, ...EXTRA_FONT_FAMILIES]
}

export function rewriteFontFamily(value: string, lang = 'zh-CN'): string {
  const important = /!\s*important\s*$/i.test(value.replace(/\/\*[\s\S]*?\*\//g, ''))
  const clean = value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/!\s*important\s*$/i, '')
  // inherit 等关键字和变量要沿用父元素或变量的值，改写成字体栈会丢掉继承关系。
  if (/^\s*(?:inherit|initial|unset|revert|revert-layer)\s*$/i.test(clean) || /var\(/i.test(clean))
    return value
  const names = splitFontFamilies(clean)
  const generic = [...names].reverse().find(name => /^(?:serif|sans-serif|monospace)$/i.test(name))?.toLowerCase()
    ?? (mapFamily(names[0] ?? '', cjkRegion(lang))?.[1] === 'Serif' ? 'serif' : 'sans-serif')
  const families = [...mappedFontFamilies(clean, lang), FALLBACK_FONT_FAMILY].map((family) => {
    const kind = family.match(/^Noto (Serif|Sans) (?:SC|TC|JP|KR)$/)?.[1]
    return kind ? `var(--bm-pdf-${kind.toLowerCase()}, "${family}")` : `"${family}"`
  })
  return ` ${families.join(', ')}, ${generic}${important ? ' !important' : ''}`
}

/**
 * 带 lang 的元素按它的语言区域重新声明字体栈。
 * var() 在声明 font-family 的元素上求值，子元素继承的是算好的值，只改变量不会影响没有自己字体栈的子元素。
 */
export function languageFontStyle(fontFamily: string, lang: string): string {
  const region = cjkRegion(lang)
  return `--bm-pdf-serif: "Noto Serif ${region}"; --bm-pdf-sans: "Noto Sans ${region}"; font-family:${rewriteFontFamily(fontFamily, lang)}`
}

export function googleFontFamily(name: string): GoogleFontFamily {
  const italic = { style: ['normal', 'italic'] as ('normal' | 'italic')[] }
  const specs: Record<string, GoogleFontFamily> = {
    'Gelasio': { name, weight: '400..700', generic: 'serif', ...italic },
    'Literata': { name, weight: '200..900', generic: 'serif', ...italic },
    'Tinos': { name, weight: [400, 700], generic: 'serif', ...italic },
    'Inter': { name, weight: '100..900', generic: 'sans-serif', ...italic },
    'Fira Mono': { name, weight: [400, 500, 700], generic: 'monospace' },
    'Noto Sans Math': { name, weight: 400 },
    'Noto Sans Symbols 2': { name, weight: 400 },
    'Noto Color Emoji': { name, weight: 400, generic: 'emoji' },
    'Noto Emoji': { name, weight: 400, generic: 'emoji' },
  }
  return specs[name] ?? { name, weight: name.includes('Serif') ? '200..900' : '100..900', generic: name.includes('Serif') ? 'serif' : 'sans-serif' }
}

export function emfontMapping(family: string): { id: string, weights: number[] } {
  if (['Gelasio', 'Literata', 'Tinos', 'Noto Serif SC'].includes(family))
    return { id: 'LXGWNeoZhiSong', weights: [400] }
  if (family === 'Fira Mono')
    return { id: 'FiraMono', weights: [400, 500, 700] }
  if (family === 'Noto Serif TC')
    return { id: 'NotoSerifTC', weights: [100, 300, 400, 500, 600, 700, 900, 950] }
  if (family === 'Noto Sans TC')
    return { id: 'NotoSansTC', weights: [100, 200, 300, 400, 500, 600, 700, 900, 950] }
  if (family === 'Noto Serif JP')
    return { id: 'GenYoMinJP', weights: [100, 200, 300, 400, 600, 700, 900] }
  if (family === 'Noto Sans JP')
    return { id: 'GenYoGothicJP', weights: [200, 300, 350, 400, 500, 700, 900] }
  if (family.endsWith(' KR'))
    return { id: 'IBMPlexSansKR', weights: [100, 200, 300, 400, 450, 500, 600, 700] }
  if (['Inter', 'Noto Sans SC'].includes(family))
    return { id: 'IBMPlexSansSC', weights: [100, 200, 300, 400, 450, 500, 600, 700] }
  return { id: 'GNUUnifont', weights: [400] }
}
