import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findBackground, withReadableContrast } from './contrast'
import { codeThemes } from './metadata'

// Vitest 默认把 `?inline` CSS 处理成空串，这里直接读依赖里的原始主题文件。
function themeCss(id: string): string {
  const path = id.startsWith('catppuccin-')
    ? join('node_modules/@catppuccin/highlightjs/css', `${id}.css`)
    : join('node_modules/highlight.js/styles', `${id}.css`)
  return readFileSync(path, 'utf8')
}

function luminance(hex: string): number {
  const full = hex.length === 4 ? [...hex.slice(1)].map(char => char + char).join('') : hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(full.slice(index, index + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

function textColors(css: string): string[] {
  return Array.from(css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[^-\w])color\s*:\s*(#[0-9a-f]{3,6})\b/gi), match => match[1])
}

describe('withReadableContrast', () => {
  it.each(codeThemes.map(theme => theme.id))('%s 的所有文字色相对背景都不低于 4.5:1', (id) => {
    const css = withReadableContrast(themeCss(id))
    const background = css.match(/\.hljs\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})/i)?.[1]
      ?? css.match(/code\.hljs\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})/i)?.[1]
    expect(background).toBeDefined()
    for (const color of textColors(css))
      expect(contrast(color, background!), color).toBeGreaterThanOrEqual(4.5)
  })

  it('按传入的代码块底色校正，深色主题放到浅色样式里也可读', () => {
    const css = withReadableContrast(themeCss('kimbie-dark'), '#faf9f5')
    for (const color of textColors(css))
      expect(contrast(color, '#faf9f5'), color).toBeGreaterThanOrEqual(4.5)
  })

  it('findBackground 取命中选择器的最后一条背景', () => {
    const css = '#bm-md pre, #bm-md .x { background-color: #111 }\n#bm-md pre code { background: #222 }\n#bm-md pre { background: #faf9f5 }'
    expect(findBackground(css, /^#bm-md pre$/)).toBe('#faf9f5')
  })

  it('只调整不达标的颜色，背景色和达标颜色保持原样', () => {
    const css = '.hljs { color: #222222; background: #fbebd4 }\n.hljs-number { color: #f79a32 }'
    const result = withReadableContrast(css)
    expect(result).toContain('.hljs { color: #222222; background: #fbebd4 }')
    expect(result).not.toContain('#f79a32')
  })

  it('浅色背景调深、深色背景调浅', () => {
    const light = withReadableContrast('.hljs { background: #ffffff }\n.a { color: #ffaa00 }').match(/\.a \{ color: (#\w+)/)![1]
    const dark = withReadableContrast('.hljs { background: #111111 }\n.a { color: #332200 }').match(/\.a \{ color: (#\w+)/)![1]
    expect(luminance(light)).toBeLessThan(luminance('#ffaa00'))
    expect(luminance(dark)).toBeGreaterThan(luminance('#332200'))
  })
})
