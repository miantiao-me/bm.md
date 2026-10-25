import { describe, expect, it, vi } from 'vitest'
import { normalizeGoogleFontsMirrorUrl } from '../google-fonts'
import { createEmfontClient, emfontDescriptors, emfontLoaders, missingGlyphDescriptors, shuffleUniqueCharacters, withEmfontFallback } from './emfont'
import { FontUnavailableError } from './fonts'

const url = 'https://font.emtech.cc/_generated/font.woff2'

describe('emfont 字体', () => {
  it('按码点去重并执行 Fisher–Yates 打乱，不上传原文顺序', () => {
    const text = '正文𠀀正文abc'
    const result = shuffleUniqueCharacters(text, () => 0)
    expect(new Set(result)).toEqual(new Set(text))
    expect(Array.from(result)).toHaveLength(new Set(text).size)
    expect(result).not.toBe(Array.from(new Set(text)).join(''))
  })

  it('pOST 成功返回字体地址，同 id/weight 的请求去重', async () => {
    const network = vi.fn().mockResolvedValue(Response.json({ code: 200, location: [url] }))
    const request = createEmfontClient(network)
    expect(await request('CNSSung', 400, '𠀀正文正文')).toEqual([url])
    await request('CNSSung', 400, '正文𠀀')
    expect(network).toHaveBeenCalledOnce()
    const [endpoint, init] = network.mock.calls[0]
    expect(endpoint).toBe('https://font.emtech.cc/g/CNSSung')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ min: true, weight: 400 })
    expect(new Set(body.words)).toEqual(new Set('𠀀正文'))
    expect(Array.from(body.words)).toHaveLength(3)
  })

  it.each(['404', 'network', 'http'])('将 %s 失败归类为字体不可用', async (kind) => {
    const network = vi.fn()
    if (kind === 'network')
      network.mockRejectedValue(new Error('offline'))
    else
      network.mockResolvedValue(kind === 'http' ? new Response('', { status: 503 }) : Response.json({ code: 404, status: 'failed' }))
    await expect(createEmfontClient(network)('bad', 400, '字')).rejects.toBeInstanceOf(FontUnavailableError)
  })

  it('备用族名保留 Google 名称，字重就近吸附并复用字体数据', async () => {
    const network = vi.fn().mockResolvedValue(Response.json({ code: 200, location: [url] }))
    const fonts = await emfontDescriptors(['Gelasio', 'Literata'], [
      { fontFamily: 'Gelasio', fontWeight: 700, italic: true },
    ], '正文', createEmfontClient(network))
    expect(fonts).toEqual([{ name: 'Gelasio', weight: 400, url }, { name: 'Literata', weight: 400, url }])
    expect(network).toHaveBeenCalledOnce()
    const fetchFont = vi.fn().mockResolvedValue(new Response('font'))
    const loaders = emfontLoaders(fonts, fetchFont)
    const data = await Promise.all(loaders.map(loader => loader.data()))
    expect(data[0]).toBe(data[1])
    expect(fetchFont).toHaveBeenCalledOnce()
  })

  it('han 扩展字符与其他符号分组补字，失败返回空列表', async () => {
    const request = vi.fn().mockResolvedValue([url])
    const result = await missingGlyphDescriptors([0x20000, 0x2318], request)
    expect(request).toHaveBeenCalledWith('CNSSung', 400, '𠀀')
    expect(request).toHaveBeenCalledWith('GNUUnifont', 400, '⌘')
    expect(result.every(font => font.name === 'bm.md Fallback')).toBe(true)
    expect(await missingGlyphDescriptors([0x2318], vi.fn().mockRejectedValue(new Error('offline')))).toEqual([])
  })

  it('google 失败后整篇切到 emfont 一次，备用源失败继续抛出', async () => {
    const google = vi.fn().mockRejectedValue(new FontUnavailableError('字体服务不可用'))
    const emfont = vi.fn().mockResolvedValue('pdf')
    expect(await withEmfontFallback(google, emfont)).toBe('pdf')
    expect(google).toHaveBeenCalledOnce()
    expect(emfont).toHaveBeenCalledOnce()
    google.mockClear()
    emfont.mockClear().mockRejectedValue(new FontUnavailableError('字体服务不可用'))
    await expect(withEmfontFallback(google, emfont)).rejects.toBeInstanceOf(FontUnavailableError)
    expect(google).toHaveBeenCalledOnce()
    expect(emfont).toHaveBeenCalledOnce()
  })

  it('渲染和缺字错误不触发整篇备用源', async () => {
    const emfont = vi.fn()
    await expect(withEmfontFallback(async () => {
      throw new Error('Missing glyph (U+20000)')
    }, emfont)).rejects.toThrow('Missing glyph')
    expect(emfont).not.toHaveBeenCalled()
  })

  it('字体地址白名单仅接受 emfont HTTPS', () => {
    expect(normalizeGoogleFontsMirrorUrl(url)).toBe(url)
    expect(() => normalizeGoogleFontsMirrorUrl('http://font.emtech.cc/a')).toThrow()
    expect(() => normalizeGoogleFontsMirrorUrl('https://font.emtech.cc.evil.test/a')).toThrow()
  })
})
