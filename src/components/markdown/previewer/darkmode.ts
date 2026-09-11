import type { RgbColor } from './darkmode-colors'
import {
  convertBackgroundColor,
  convertForegroundColor,
  convertLineColor,
  DEFAULT_DARK_BACKGROUND,
  DEFAULT_DARK_TEXT,
  parseColor,
  serializeColor,
} from './darkmode-colors'

const BACKGROUND_PROPERTIES = [
  'background-color',
]

const FOREGROUND_PROPERTIES = [
  'color',
  'text-decoration-color',
  'text-emphasis-color',
  'caret-color',
  'fill',
  'stroke',
]

const LINE_PROPERTIES = [
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'column-rule-color',
  'accent-color',
]

const SHADOW_PROPERTIES = [
  'box-shadow',
  'text-shadow',
]

const COMPLEX_BACKGROUND_PROPERTIES = [
  'background',
  'background-image',
]

const COLOR_TOKEN_RE = /#[\da-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi

export function applyDarkModeToPreviewHtml(html: string): string {
  if (!html.trim() || typeof document === 'undefined') {
    return html
  }

  const template = document.createElement('template')
  template.innerHTML = html

  for (const child of Array.from(template.content.children)) {
    transformElement(child, DEFAULT_DARK_BACKGROUND)
  }

  return template.innerHTML
}

function transformElement(element: Element, inheritedBackground: RgbColor): RgbColor {
  if (element.hasAttribute('data-no-dark')) {
    return inheritedBackground
  }

  const style = (element as HTMLElement).style
  let currentBackground = inheritedBackground

  if (element.id === 'bm-md' && !hasVisibleColor(style, 'background-color')) {
    style.setProperty('background-color', serializeColor(DEFAULT_DARK_BACKGROUND))
    currentBackground = DEFAULT_DARK_BACKGROUND
  }

  for (const property of BACKGROUND_PROPERTIES) {
    const color = readStyleColor(style, property)
    if (!color)
      continue

    const converted = convertBackgroundColor(color)
    writeStyleColor(style, property, converted)
    currentBackground = converted
  }

  for (const property of COMPLEX_BACKGROUND_PROPERTIES) {
    transformComplexColorValue(style, property, color => convertBackgroundColor(color))
  }

  if (element.id === 'bm-md' && !hasVisibleColor(style, 'color')) {
    style.setProperty('color', serializeColor(DEFAULT_DARK_TEXT))
  }

  for (const property of FOREGROUND_PROPERTIES) {
    const color = readStyleColor(style, property)
    if (!color)
      continue

    writeStyleColor(style, property, convertForegroundColor(color, currentBackground))
  }

  for (const property of LINE_PROPERTIES) {
    const color = readStyleColor(style, property)
    if (!color)
      continue

    writeStyleColor(style, property, convertLineColor(color, currentBackground))
  }

  for (const property of SHADOW_PROPERTIES) {
    transformComplexColorValue(style, property, color => convertLineColor(color, currentBackground))
  }

  for (const child of Array.from(element.children)) {
    transformElement(child, currentBackground)
  }

  if (style.length === 0) {
    element.removeAttribute('style')
  }

  return currentBackground
}

function readStyleColor(style: CSSStyleDeclaration, property: string): RgbColor | null {
  const value = style.getPropertyValue(property).trim()
  if (!value)
    return null

  return parseColor(value)
}

function writeStyleColor(style: CSSStyleDeclaration, property: string, color: RgbColor) {
  const priority = style.getPropertyPriority(property)
  style.setProperty(property, serializeColor(color), priority)
}

function hasVisibleColor(style: CSSStyleDeclaration, property: string): boolean {
  const color = readStyleColor(style, property)
  return Boolean(color && color.a > 0)
}

function transformComplexColorValue(
  style: CSSStyleDeclaration,
  property: string,
  convert: (color: RgbColor) => RgbColor,
) {
  const value = style.getPropertyValue(property)
  if (!value || value.includes('url('))
    return

  const nextValue = value.replace(COLOR_TOKEN_RE, (token) => {
    const color = parseColor(token)
    return color ? serializeColor(convert(color)) : token
  })

  if (nextValue !== value) {
    style.setProperty(property, nextValue, style.getPropertyPriority(property))
  }
}
