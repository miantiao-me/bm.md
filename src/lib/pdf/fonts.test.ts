import { describe, expect, it, vi } from 'vitest'
import {
  createCachedFontFetch,
  FontUnavailableError,
  generatedProbe,
  googleFontFamily,
  isSerifFontFamily,
  missingGlyphs,
  replaceGraphemes,
  selectFontFamilies,
} from './fonts'

describe('pdf 字体', () => {
  it('为 Serif 与 Sans CJK 使用正确字重范围', () => {
    expect(googleFontFamily('Noto Serif SC')).toMatchObject({ generic: 'serif', weight: '200..900' })
    expect(googleFontFamily('Noto Sans TC')).toMatchObject({ generic: 'sans-serif', weight: '100..900' })
    expect(googleFontFamily('Noto Sans Mono')).toMatchObject({ weight: [400, 700] })
  })

  it('按语言、代码和 Emoji 选择 CJK/Mono/Emoji 字体', () => {
    expect(selectFontFamilies({
      lang: 'zh-Hant',
      languages: ['ja'],
      text: '繁體 かな ✅',
      typography: { bodySerif: true },
      usesCode: true,
    })).toEqual([
      'Noto Serif TC',
      'Noto Serif JP',
      'Noto Sans Mono',
      'Noto Sans TC',
      'Noto Sans JP',
      'Noto Color Emoji',
      'Noto Emoji',
    ])
  })

  it('识别常见 Serif 字体且不把 Sans Serif 误判', () => {
    for (const family of ['serif', 'Noto Serif SC', 'Georgia', 'Times New Roman', 'Songti SC', 'STSong', 'MingLiU', 'SimSun'])
      expect(isSerifFontFamily(family)).toBe(true)
    for (const family of ['sans-serif', 'Noto Sans SC', 'Arial', 'Source Sans 3'])
      expect(isSerifFontFamily(family)).toBe(false)
  })

  it('混排时同时选择正文和标题家族并去重，无标题时不额外加载', () => {
    const base = { lang: 'zh-CN', languages: [], text: '正文', usesCode: false }
    expect(selectFontFamilies({ ...base, typography: { bodySerif: false, headingSerif: true } }))
      .toEqual(['Noto Sans SC', 'Noto Serif SC'])
    expect(selectFontFamilies({ ...base, typography: { bodySerif: false } }))
      .toEqual(['Noto Sans SC'])
    expect(selectFontFamilies({ ...base, typography: { bodySerif: true, headingSerif: true } }))
      .toEqual(['Noto Serif SC'])
  })

  it('generated content 探针对 Emoji 同时加入彩色与单色字体', () => {
    expect(generatedProbe([0x2705], 'zh-CN')).toMatchObject({
      fontFamilies: ['Noto Sans Mono', 'Noto Sans SC', 'Noto Color Emoji', 'Noto Emoji'],
      text: '✅',
    })
  })

  it('按 grapheme 替换缺字且 Segmenter 不可用时拒绝破坏性替换', () => {
    expect(replaceGraphemes('完成✅️', new Set([0x2705]))).toEqual({
      replacements: [{ original: '✅️', codepoints: [0x2705, 0xFE0F] }],
      text: '完成□',
    })
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    expect(replaceGraphemes('保留✅️', new Set([0x2705]), segmenter)).toEqual({
      replacements: [{ original: '✅️', codepoints: [0x2705, 0xFE0F] }],
      text: '保留□',
    })
    expect(() => replaceGraphemes('👨‍👩‍👧‍👦', new Set([0x1F468]), null))
      .toThrow('无法安全处理缺失字符')
  })

  it('提取并去重 Takumi 缺字码位', () => {
    expect(missingGlyphs(new Error('Missing (U+2705), (U+21A9), (U+2705)')))
      .toEqual([0x2705, 0x21A9])
  })
})

describe('pdf 字体缓存与镜像', () => {
  it('将 Google Fonts .com 改写到 .cn，并在不可信域名时不发送网络请求', async () => {
    const storage = {
      async open() {
        return { match: vi.fn(), put: vi.fn() }
      },
    }
    const network = vi.fn().mockResolvedValue(new Response('font'))
    const cachedFetch = createCachedFontFetch(storage, network)

    await cachedFetch('https://fonts.googleapis.com/css2?family=Noto+Sans+SC')
    expect(network).toHaveBeenCalledWith(
      'https://fonts.googleapis.cn/css2?family=Noto+Sans+SC',
      undefined,
    )
    network.mockClear()
    await expect(cachedFetch('https://fonts.googleapis.com.evil.test/css2'))
      .rejects
      .toBeInstanceOf(FontUnavailableError)
    expect(network).not.toHaveBeenCalled()
  })

  it('优先命中缓存，并把成功的网络响应写入缓存', async () => {
    const cssUrl = 'https://fonts.googleapis.cn/css2?family=Noto+Sans+SC'
    const fontUrl = 'https://fonts.gstatic.cn/s/noto.woff2'
    const entries = new Map([[cssUrl, new Response('cached css')]])
    const put = vi.fn(async (url: string, response: Response) => {
      entries.set(url, response.clone())
    })
    const storage = {
      async open() {
        return {
          match: async (url: string) => entries.get(url)?.clone(),
          put,
        }
      },
    }
    const network = vi.fn().mockResolvedValue(new Response('network font'))
    const cachedFetch = createCachedFontFetch(storage, network)

    expect(await (await cachedFetch(cssUrl)).text()).toBe('cached css')
    expect(network).not.toHaveBeenCalled()
    expect(await (await cachedFetch(fontUrl)).text()).toBe('network font')
    expect(await entries.get(fontUrl)?.text()).toBe('network font')
    expect(put).toHaveBeenCalledOnce()
  })

  it('缓存 open、match、put 失败仍在线加载，网络失败归类为字体不可用', async () => {
    const network = vi.fn().mockResolvedValue(new Response('online'))
    const openFailed = { open: vi.fn().mockRejectedValue(new Error('open failed')) }
    expect(await (await createCachedFontFetch(openFailed, network)(
      'https://fonts.googleapis.com/css2?family=Open',
    )).text()).toBe('online')

    const matchFailed = {
      async open() {
        return { match: vi.fn().mockRejectedValue(new Error('match failed')), put: vi.fn() }
      },
    }
    expect(await (await createCachedFontFetch(matchFailed, network)(
      'https://fonts.googleapis.com/css2?family=Match',
    )).text()).toBe('online')

    const putFailed = {
      async open() {
        return { match: vi.fn(), put: vi.fn().mockRejectedValue(new Error('put failed')) }
      },
    }
    expect(await (await createCachedFontFetch(putFailed, network)(
      'https://fonts.googleapis.com/css2?family=Put',
    )).text()).toBe('online')

    const offline = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(createCachedFontFetch(openFailed, offline)(
      'https://fonts.googleapis.com/css2?family=Offline',
    )).rejects.toBeInstanceOf(FontUnavailableError)
  })
})
