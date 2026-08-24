import { PdfError } from './protocol'

const KATEX_SELECTOR = '[data-bm-rich="katex"]'
const SNAPSHOT_ERROR = '数学公式快照失败，请刷新后重试'

interface RgbaColor {
  alpha: number
  blue: number
  green: number
  red: number
}

function parseComputedColor(value: string): RgbaColor | undefined {
  const normalized = value.trim().toLowerCase()
  const isRgba = normalized.startsWith('rgba(')
  const isRgb = normalized.startsWith('rgb(')
  if ((!isRgba && !isRgb) || !normalized.endsWith(')'))
    return undefined

  const values = normalized
    .slice(isRgba ? 5 : 4, -1)
    .split(',')
    .map(part => part.trim())
  if (values.length !== (isRgba ? 4 : 3) || values.includes(''))
    return undefined

  const numbers = values.map(Number)
  if (numbers.some(number => !Number.isFinite(number)))
    return undefined

  const channels = numbers.slice(0, 3)
  const parsedAlpha = isRgba ? numbers[3] : 1
  if (channels.some(channel => channel < 0 || channel > 255) || parsedAlpha < 0 || parsedAlpha > 1)
    return undefined

  return {
    alpha: parsedAlpha,
    blue: channels[2],
    green: channels[1],
    red: channels[0],
  }
}

function captureBackgroundColor(source: Element): string {
  const view = source.ownerDocument.defaultView
  const ancestors: RgbaColor[] = []
  for (let element = source.parentElement; element; element = element.parentElement) {
    const color = parseComputedColor(view?.getComputedStyle(element).backgroundColor ?? '')
    if (color)
      ancestors.push(color)
  }

  let red = 255
  let green = 255
  let blue = 255
  for (const color of ancestors.reverse()) {
    red = color.red * color.alpha + red * (1 - color.alpha)
    green = color.green * color.alpha + green * (1 - color.alpha)
    blue = color.blue * color.alpha + blue * (1 - color.alpha)
  }
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`
}

function snapshotFailure(cause: unknown): PdfError {
  return new PdfError('snapshotFailed', SNAPSHOT_ERROR, { cause })
}

function inlineBaseline(source: Element, rect: DOMRect): number {
  const marker = source.ownerDocument.createElement('span')
  marker.setAttribute('aria-hidden', 'true')
  marker.setAttribute('style', 'display:inline-block!important;width:0!important;height:0!important;padding:0!important;border:0!important;margin:0!important;vertical-align:baseline!important')
  try {
    source.after(marker)
    return rect.bottom - marker.getBoundingClientRect().top
  }
  finally {
    marker.remove()
  }
}

async function captureFormula(
  snapdom: typeof import('@zumer/snapdom')['snapdom'],
  source: Element,
  display: boolean,
) {
  const options = {
    backgroundColor: captureBackgroundColor(source),
    dpr: 2,
    embedFonts: true,
  } as const
  if (display)
    return snapdom(source, options)

  const style = (source as HTMLElement).style
  const originalWhiteSpace = style.getPropertyValue('white-space')
  const originalPriority = style.getPropertyPriority('white-space')
  style.setProperty('white-space', 'nowrap', 'important')
  try {
    return await snapdom(source, options)
  }
  finally {
    if (originalWhiteSpace)
      style.setProperty('white-space', originalWhiteSpace, originalPriority)
    else
      style.removeProperty('white-space')
  }
}

export async function replaceKatexWithImages(sourceRoot: Element, cloneRoot: Element): Promise<string[]> {
  const sources = Array.from(sourceRoot.querySelectorAll(KATEX_SELECTOR))
  const clones = Array.from(cloneRoot.querySelectorAll(KATEX_SELECTOR))
  if (sources.length === 0 && clones.length === 0)
    return []

  const urls: string[] = []
  try {
    if (sources.length !== clones.length)
      throw new Error('KaTeX metadata count mismatch')
    const pairs = sources.map((source, index) => {
      const clone = clones[index]
      const sourceHash = source.getAttribute('data-bm-hash')
      const cloneHash = clone.getAttribute('data-bm-hash')
      const display = source.classList.contains('katex-display')
      if (!sourceHash || sourceHash !== cloneHash || display !== clone.classList.contains('katex-display'))
        throw new Error('KaTeX metadata mismatch')
      return { clone, display, source }
    })

    await sourceRoot.ownerDocument.fonts?.ready
    const { snapdom } = await import('@zumer/snapdom')
    for (const { clone, display, source } of pairs) {
      const rect = source.getBoundingClientRect()
      const computed = source.ownerDocument.defaultView?.getComputedStyle(source)
      const descent = display ? 0 : inlineBaseline(source, rect)
      const snapshot = await captureFormula(snapdom, source, display)
      const blob = await snapshot.toBlob({ dpr: 2, type: 'png' })
      if (blob.size === 0)
        throw new Error('KaTeX snapshot is empty')

      const url = URL.createObjectURL(blob)
      urls.push(url)
      const image = clone.ownerDocument.createElement('img')
      image.alt = source.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim() || '数学公式'
      image.className = display ? 'bm-pdf-katex-display' : 'bm-pdf-katex-inline'
      image.src = url
      image.setAttribute('style', display
        ? `width:${rect.width}px;height:auto;margin-top:${computed?.marginTop ?? '0px'};margin-bottom:${computed?.marginBottom ?? '0px'}`
        : `width:${rect.width}px;height:auto;vertical-align:${-descent}px`)
      clone.replaceWith(image)
    }
    return urls
  }
  catch (error) {
    for (const url of urls)
      URL.revokeObjectURL(url)
    throw snapshotFailure(error)
  }
}
