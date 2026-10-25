const MIN_CONTRAST = 4.5

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb | undefined {
  const value = hex.slice(1)
  const full = value.length === 3 ? [...value].map(char => char + char).join('') : value
  if (!/^[0-9a-f]{6}$/i.test(full))
    return undefined
  return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16) / 255) as Rgb
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`
}

const toLinear = (channel: number) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
const fromLinear = (channel: number) => channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

function toOklab(rgb: Rgb): Rgb {
  const [r, g, b] = rgb.map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

/** 超出 sRGB 时返回 undefined，由调用方降低彩度重试。 */
function fromOklab([L, a, b]: Rgb): Rgb | undefined {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
  if (linear.some(channel => channel < -1e-4 || channel > 1 + 1e-4))
    return undefined
  return linear.map(channel => fromLinear(Math.min(1, Math.max(0, channel)))) as Rgb
}

/** 保持色相，只沿 OKLCH 明度远离背景，直到对比度达标；超出色域时按比例降低彩度。 */
function readableColor(color: Rgb, background: Rgb): Rgb {
  if (contrast(color, background) >= MIN_CONTRAST)
    return color
  const [L, a, b] = toOklab(color)
  const step = luminance(background) > 0.18 ? -0.005 : 0.005
  for (let lightness = L + step; lightness >= 0 && lightness <= 1; lightness += step) {
    for (let chroma = 1; chroma >= 0; chroma -= 0.05) {
      const candidate = fromOklab([lightness, a * chroma, b * chroma])
      if (!candidate)
        continue
      // 按输出的十六进制取整后再判断，避免取整让对比度掉到阈值以下。
      const rounded = parseHex(toHex(candidate))!
      if (contrast(rounded, background) >= MIN_CONTRAST)
        return rounded
      break
    }
  }
  return step < 0 ? [0, 0, 0] : [1, 1, 1]
}

/** 取选择器列表命中 `selector` 的最后一条规则里的背景色。 */
export function findBackground(css: string, selector: RegExp): string | undefined {
  let result: string | undefined
  for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const background = body.match(/background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/i)?.[1]
    if (background && selectors.split(',').some(item => selector.test(item.trim())))
      result = background
  }
  return result
}

/**
 * 第三方代码主题里不少 token 颜色对比度不足（kimbie-light 的数字只有 1.86:1），
 * 统一把文字色调到相对代码块底色至少 4.5:1，色相保持不变。
 * Markdown 样式会把 `pre code` 设成透明底，所以底色优先用样式的 pre 背景，没有时才用主题自己的 `.hljs` 背景。
 */
export function withReadableContrast(css: string, background = findBackground(css, /^(?:pre\s+)?(?:code)?\.hljs$/)): string {
  const backgroundRgb = background ? parseHex(background) : undefined
  if (!backgroundRgb)
    return css
  return css.replace(/(^|[^-\w])(color\s*:\s*)(#[0-9a-f]{3,6})\b/gi, (match, prefix: string, property: string, hex: string) => {
    const color = parseHex(hex)
    if (!color || contrast(color, backgroundRgb) >= MIN_CONTRAST)
      return match
    return `${prefix}${property}${toHex(readableColor(color, backgroundRgb))}`
  })
}
