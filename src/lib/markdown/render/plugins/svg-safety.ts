import type { Element, RootContent, Text } from 'hast'
import { escapeRegExp } from 'es-toolkit'
import { isElement } from '@/lib/markdown/hast'

const allowedTags = new Set([
  'a',
  'b',
  'br',
  'circle',
  'clippath',
  'defs',
  'desc',
  'div',
  'ellipse',
  'em',
  'feblend',
  'fecolormatrix',
  'fecomposite',
  'fedropshadow',
  'feflood',
  'fegaussianblur',
  'femerge',
  'femergenode',
  'femorphology',
  'feoffset',
  'filter',
  'foreignobject',
  'g',
  'image',
  'i',
  'line',
  'lineargradient',
  'marker',
  'mask',
  'p',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'small',
  'span',
  'stop',
  'strong',
  'style',
  'sub',
  'sup',
  'svg',
  'symbol',
  'text',
  'title',
  'tspan',
  'use',
])

const urlAttributeNames = new Set([
  'action',
  'data',
  'formaction',
  'href',
  'poster',
  'src',
  'xlinkhref',
])

const blockedAttributeNames = new Set([
  'srcdoc',
])

const idReferenceAttributeNames = new Set([
  'ariaactivedescendant',
  'ariacontrols',
  'ariadescribedby',
  'ariaerrormessage',
  'ariaflowto',
  'arialabelledby',
  'ariaowns',
])

function isText(node: RootContent): node is Text {
  return node.type === 'text'
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

function isSafeDataImageUrl(value: string): boolean {
  return /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
}

function isSafeUrl(value: string): boolean {
  const normalized = [...value.trim()]
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code > 0x20 && code !== 0x7F
    })
    .join('')

  return normalized.startsWith('#') || isSafeDataImageUrl(normalized)
}

function sanitizeUrlFunction(value: string): string {
  let result = ''
  let index = 0
  const lowerValue = value.toLowerCase()

  while (index < value.length) {
    const urlStart = lowerValue.indexOf('url(', index)
    if (urlStart === -1) {
      result += value.slice(index)
      break
    }

    result += value.slice(index, urlStart)
    let cursor = urlStart + 4

    while (cursor < value.length && /\s/.test(value[cursor])) {
      cursor++
    }

    const quote = value[cursor] === '"' || value[cursor] === '\'' ? value[cursor] : ''
    if (quote) {
      cursor++
    }

    const rawUrlStart = cursor
    let rawUrlEnd = -1
    let functionEnd = -1

    if (quote) {
      rawUrlEnd = value.indexOf(quote, cursor)
      if (rawUrlEnd !== -1) {
        functionEnd = value.indexOf(')', rawUrlEnd + 1)
      }
    }
    else {
      functionEnd = value.indexOf(')', cursor)
      rawUrlEnd = functionEnd
    }

    if (rawUrlEnd === -1 || functionEnd === -1) {
      result += 'none'
      break
    }

    const url = value.slice(rawUrlStart, rawUrlEnd).trim()
    result += isSafeUrl(url) ? `url(${url})` : 'none'
    index = functionEnd + 1
  }

  return result
}

function removeCssImports(value: string): string {
  return value
    .split('\n')
    .filter(line => !line.trimStart().toLowerCase().startsWith('@import'))
    .join('\n')
}

function sanitizeStyleValue(value: string): string {
  return sanitizeUrlFunction(removeCssImports(value))
    .replace(/expression\s*\(/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/behavior\s*:/gi, '')
}

function sanitizePropertyValue(name: string, value: unknown): unknown | undefined {
  if (typeof value === 'string') {
    if (name === 'style') {
      return sanitizeStyleValue(value)
    }

    if (urlAttributeNames.has(normalizeName(name))) {
      return isSafeUrl(value) ? value : undefined
    }

    return value
  }

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizePropertyValue(name, item))
      .filter(item => item !== undefined)
  }

  return value
}

function sanitizeProperties(node: Element): void {
  const properties = node.properties as Record<string, unknown>

  for (const [name, value] of Object.entries(properties)) {
    const normalized = normalizeName(name)
    if (normalized.startsWith('on') || blockedAttributeNames.has(normalized)) {
      delete properties[name]
      continue
    }

    const sanitized = sanitizePropertyValue(name, value)
    if (sanitized === undefined) {
      delete properties[name]
    }
    else {
      properties[name] = sanitized
    }
  }
}

function sanitizeStyleElement(node: Element): void {
  const children: Element['children'] = []

  for (const child of node.children) {
    if (isText(child)) {
      children.push({ ...child, value: sanitizeStyleValue(child.value) })
    }
  }

  node.children = children
}

function sanitizeNode(node: Element): boolean {
  const tagName = node.tagName.toLowerCase()
  if (!allowedTags.has(tagName)) {
    return false
  }

  sanitizeProperties(node)

  if (tagName === 'style') {
    sanitizeStyleElement(node)
    return true
  }

  const children: Element['children'] = []
  for (const child of node.children) {
    if (isElement(child)) {
      if (sanitizeNode(child)) {
        children.push(child)
      }
      continue
    }

    children.push(child)
  }
  node.children = children

  return true
}

function sortedIds(idMap: Map<string, string>): string[] {
  return [...idMap.keys()].sort((a, b) => b.length - a.length)
}

interface ReplacementRule {
  pattern: RegExp
  replacement: string
}

function createUrlIdReferenceRules(idMap: Map<string, string>): ReplacementRule[] {
  return sortedIds(idMap).reduce<ReplacementRule[]>((rules, id) => {
    const prefixedId = idMap.get(id)
    if (prefixedId) {
      const escaped = escapeRegExp(id)
      rules.push({
        pattern: new RegExp(`url\\(\\s*(['"]?)#${escaped}\\1\\s*\\)`, 'g'),
        replacement: `url(#${prefixedId})`,
      })
    }

    return rules
  }, [])
}

function createCssIdSelectorRules(idMap: Map<string, string>): ReplacementRule[] {
  return sortedIds(idMap).reduce<ReplacementRule[]>((rules, id) => {
    const prefixedId = idMap.get(id)
    if (prefixedId) {
      rules.push({
        pattern: new RegExp(`#${escapeRegExp(id)}(?=[\\s,.#:{>+~\\[]|$)`, 'g'),
        replacement: `#${prefixedId}`,
      })
    }

    return rules
  }, [])
}

function applyReplacementRules(value: string, rules: ReplacementRule[]): string {
  let next = value

  for (const { pattern, replacement } of rules) {
    next = next.replace(pattern, replacement)
  }

  return next
}

function replaceUrlIdReferences(value: string, rules: ReplacementRule[]): string {
  return applyReplacementRules(value, rules)
}

function replaceCssIdSelectors(value: string, rules: ReplacementRule[]): string {
  return applyReplacementRules(value, rules)
}

function replaceHashReference(value: string, idMap: Map<string, string>): string {
  const trimmed = value.trim()
  return trimmed.startsWith('#') ? `#${idMap.get(trimmed.slice(1)) ?? trimmed.slice(1)}` : value
}

function replaceSpaceSeparatedIdReferences(value: string, idMap: Map<string, string>): string {
  return value.split(/\s+/).map(id => idMap.get(id) ?? id).join(' ')
}

function replacePropertyIdReferences(
  name: string,
  value: string,
  idMap: Map<string, string>,
  urlIdReferenceRules: ReplacementRule[],
): string {
  const normalizedName = normalizeName(name)
  let next = replaceUrlIdReferences(value, urlIdReferenceRules)

  if (idReferenceAttributeNames.has(normalizedName)) {
    next = replaceSpaceSeparatedIdReferences(next, idMap)
  }
  else if (urlAttributeNames.has(normalizedName)) {
    next = replaceHashReference(next, idMap)
  }

  return next
}

function walkElements(node: Element, visitor: (element: Element) => void): void {
  visitor(node)

  for (const child of node.children) {
    if (isElement(child)) {
      walkElements(child, visitor)
    }
  }
}

export function sanitizeSvgElement(svgNode: Element): void {
  sanitizeNode(svgNode)
}

export function prefixSvgIds(svgNode: Element, prefix: string): void {
  const idMap = new Map<string, string>()

  walkElements(svgNode, (element) => {
    const id = element.properties?.id
    if (typeof id === 'string' && id) {
      idMap.set(id, `${prefix}${id}`)
    }
  })

  if (idMap.size === 0) {
    return
  }

  const urlIdReferenceRules = createUrlIdReferenceRules(idMap)
  const cssIdSelectorRules = createCssIdSelectorRules(idMap)

  walkElements(svgNode, (element) => {
    const properties = element.properties as Record<string, unknown>

    for (const [name, value] of Object.entries(properties)) {
      if (name === 'id' && typeof value === 'string') {
        properties[name] = idMap.get(value) ?? value
        continue
      }

      if (typeof value === 'string') {
        properties[name] = replacePropertyIdReferences(name, value, idMap, urlIdReferenceRules)
      }
      else if (Array.isArray(value)) {
        properties[name] = value.map((item) => {
          if (typeof item === 'string') {
            return replacePropertyIdReferences(name, item, idMap, urlIdReferenceRules)
          }

          return item
        })
      }
    }

    if (element.tagName.toLowerCase() === 'style') {
      for (const child of element.children) {
        if (isText(child)) {
          child.value = replaceCssIdSelectors(
            replaceUrlIdReferences(child.value, urlIdReferenceRules),
            cssIdSelectorRules,
          )
        }
      }
    }
  })
}
