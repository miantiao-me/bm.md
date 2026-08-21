export const GOOGLE_FONTS_CSS_ORIGIN = 'https://fonts.googleapis.cn'
export const GOOGLE_FONTS_CSS_BASE_URL = `${GOOGLE_FONTS_CSS_ORIGIN}/css2`
export const GOOGLE_FONTS_STATIC_ORIGIN = 'https://fonts.gstatic.cn'

const FONT_HOST_MIRRORS: Record<string, string> = {
  'fonts.googleapis.cn': 'fonts.googleapis.cn',
  'fonts.googleapis.com': 'fonts.googleapis.cn',
  'fonts.gstatic.cn': 'fonts.gstatic.cn',
  'fonts.gstatic.com': 'fonts.gstatic.cn',
}

export function normalizeGoogleFontsMirrorUrl(input: string): string {
  const url = new URL(input)
  const mirrorHost = FONT_HOST_MIRRORS[url.hostname]
  if (!mirrorHost || url.protocol !== 'https:' || url.port)
    throw new Error(`不受信任的字体地址：${url.hostname}`)
  url.hostname = mirrorHost
  return url.href
}
