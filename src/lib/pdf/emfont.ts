import type { FontUsage } from './fonts'
import { normalizeGoogleFontsMirrorUrl } from '../google-fonts'
import { emfontMapping, FALLBACK_FONT_FAMILY } from './font-map'
import { FontUnavailableError, isFontUnavailable } from './fonts'

export interface EmfontDescriptor {
  name: string
  url: string
  weight: number
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export function shuffleUniqueCharacters(text: string, random: () => number = Math.random): string {
  const characters = Array.from(new Set(text))
  for (let index = characters.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[characters[index], characters[target]] = [characters[target], characters[index]]
  }
  return characters.join('')
}

export function createEmfontClient(networkFetch: Fetch = fetch) {
  const requests = new Map<string, Promise<string[]>>()
  return (id: string, weight: number, text: string): Promise<string[]> => {
    // 一个客户端对应一次文档渲染；补字按字符集合区分，避免复用不含新字符的切片。
    const key = `${id}:${weight}:${Array.from(new Set(text)).sort().join('')}`
    let pending = requests.get(key)
    if (!pending) {
      pending = (async () => {
        try {
          const response = await networkFetch(`https://font.emtech.cc/g/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: shuffleUniqueCharacters(text), min: true, weight }),
            signal: AbortSignal.timeout(15_000),
          })
          if (!response.ok)
            throw new Error('字体服务不可用')
          const result = await response.json() as { code?: number, location?: unknown }
          if (result.code !== 200 || !Array.isArray(result.location) || result.location.length === 0)
            throw new Error('字体服务不可用')
          return result.location.map((url: unknown) => {
            if (typeof url !== 'string' || new URL(url).hostname !== 'font.emtech.cc')
              throw new Error('字体服务不可用')
            return normalizeGoogleFontsMirrorUrl(url)
          })
        }
        catch (error) {
          throw new FontUnavailableError('字体服务不可用', { cause: error })
        }
      })()
      requests.set(key, pending)
    }
    return pending
  }
}

export async function emfontDescriptors(
  families: string[],
  usages: FontUsage[],
  text: string,
  request = createEmfontClient(),
): Promise<EmfontDescriptor[]> {
  const descriptors = await Promise.all(families.map(async (name) => {
    const mapping = emfontMapping(name)
    const weights = new Set(usages.filter(usage => usage.fontFamily === name).map(usage => usage.fontWeight))
    if (!weights.size) {
      for (const usage of usages)
        weights.add(usage.fontWeight)
      if (!weights.size)
        weights.add(400)
    }
    return (await Promise.all([...weights].map(async (requestedWeight) => {
      const weight = mapping.weights.reduce((nearest, candidate) => Math.abs(candidate - requestedWeight) < Math.abs(nearest - requestedWeight) ? candidate : nearest)
      const urls = await request(mapping.id, weight, text)
      return urls.map(url => ({ name, url, weight }))
    }))).flat()
  }))
  return [...new Map(descriptors.flat().map(font => [`${font.name}:${font.url}:${font.weight}`, font])).values()]
}

export async function missingGlyphDescriptors(codepoints: number[], request = createEmfontClient()): Promise<EmfontDescriptor[]> {
  const groups = new Map<string, string[]>()
  for (const codepoint of codepoints) {
    const character = String.fromCodePoint(codepoint)
    const id = /\p{Script=Han}/u.test(character) ? 'CNSSung' : 'GNUUnifont'
    const characters = groups.get(id) ?? []
    characters.push(character)
    groups.set(id, characters)
  }
  const results = await Promise.all([...groups].map(async ([id, characters]) => {
    try {
      const urls = await request(id, 400, characters.join(''))
      return urls.map(url => ({ name: FALLBACK_FONT_FAMILY, url, weight: 400 }))
    }
    catch {
      // 补字失败仍可由现有缺字恢复流程替换为方框。
      return []
    }
  }))
  return results.flat()
}

export function emfontLoaders(descriptors: EmfontDescriptor[], cachedFetch: Fetch) {
  const data = new Map<string, Promise<ArrayBuffer>>()
  return descriptors.map(font => ({
    name: font.name === FALLBACK_FONT_FAMILY ? `${font.name} ${font.url}` : font.name,
    subsetOf: font.name === FALLBACK_FONT_FAMILY ? font.name : undefined,
    weight: font.weight,
    style: 'normal',
    key: `${font.name}:${font.weight}:${font.url}`,
    data() {
      let pending = data.get(font.url)
      if (!pending) {
        pending = cachedFetch(font.url, { signal: AbortSignal.timeout(15_000) }).then((response) => {
          if (!response.ok)
            throw new FontUnavailableError('字体服务不可用')
          return response.arrayBuffer()
        }).catch((error) => {
          throw new FontUnavailableError('字体服务不可用', { cause: error })
        })
        data.set(font.url, pending)
      }
      return pending
    },
  }))
}

export async function withEmfontFallback<T>(google: () => Promise<T>, emfont: () => Promise<T>): Promise<T> {
  try {
    return await google()
  }
  catch (error) {
    if (!isFontUnavailable(error) || /missing glyph/i.test(error instanceof Error ? error.message : String(error)))
      throw error
    return emfont()
  }
}
