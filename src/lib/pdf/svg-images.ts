import { logSafeError } from '@/lib/log-safe-error'
import { getSafeRasterScale } from '@/lib/raster'
import { PDF_IMAGE_MAX_BYTES } from './protocol'

const COMPLEX_SVG_SELECTOR = [
  'text',
  'tspan',
  'foreignObject',
  'filter',
  'image',
  'use',
  'mask',
  'pattern',
  'style',
  'animate',
  'animateTransform',
  '[filter]',
  '[mask]',
  '[clip-path]',
  '[marker-start]',
  '[marker-mid]',
  '[marker-end]',
].join(',')

interface CaptureSize {
  height: number
  layoutWidth: number
  width: number
}

function isSvgImage(image: HTMLImageElement, baseUrl: string): boolean {
  const source = (image.currentSrc || image.getAttribute('src') || '').trim()
  if (/^data:image\/svg\+xml(?:[;,]|$)/i.test(source))
    return true
  try {
    return new URL(source, baseUrl).pathname.toLowerCase().endsWith('.svg')
  }
  catch {
    return false
  }
}

function shouldCapture(element: SVGSVGElement | HTMLImageElement, baseUrl: string): boolean {
  if (element.closest('[data-bm-rich="katex"]'))
    return false
  if (element instanceof HTMLImageElement)
    return isSvgImage(element, baseUrl)
  return element.matches('.figure-mermaid > svg, .figure-infographic > svg')
    || element.matches(COMPLEX_SVG_SELECTOR)
    || Boolean(element.querySelector(COMPLEX_SVG_SELECTOR))
}

function candidates(root: Element): Array<SVGSVGElement | HTMLImageElement> {
  const matches = Array.from(root.querySelectorAll<SVGSVGElement | HTMLImageElement>('svg, img'))
    .filter(element => shouldCapture(element, root.ownerDocument.baseURI))
  return matches.filter(element => !matches.some(parent => parent !== element && parent.contains(element)))
}

function identity(element: SVGSVGElement | HTMLImageElement, baseUrl: string): string {
  if (element instanceof HTMLImageElement) {
    const source = (element.currentSrc || element.getAttribute('src') || '').trim()
    try {
      return `img:${new URL(source, baseUrl).href}`
    }
    catch {
      return `img:${source}`
    }
  }
  if (element.matches('.figure-mermaid > svg'))
    return 'svg:mermaid'
  if (element.matches('.figure-infographic > svg'))
    return 'svg:infographic'
  return 'svg:complex'
}

function pixel(value: string | undefined): number {
  const number = Number.parseFloat(value || '')
  return Number.isFinite(number) ? number : 0
}

function contentSize(source: SVGSVGElement | HTMLImageElement): CaptureSize {
  const computed = source.ownerDocument.defaultView?.getComputedStyle(source)
  const horizontal = pixel(computed?.paddingLeft) + pixel(computed?.paddingRight)
  const vertical = pixel(computed?.paddingTop) + pixel(computed?.paddingBottom)
  const borderHorizontal = pixel(computed?.borderLeftWidth) + pixel(computed?.borderRightWidth)
  const borderVertical = pixel(computed?.borderTopWidth) + pixel(computed?.borderBottomWidth)
  const rect = source.getBoundingClientRect()
  const width = source.clientWidth > 0 ? source.clientWidth - horizontal : rect.width - horizontal - borderHorizontal
  const height = source.clientHeight > 0 ? source.clientHeight - vertical : rect.height - vertical - borderVertical
  if (width <= 0 || height <= 0)
    throw new Error('SVG snapshot has no content size')
  return {
    height,
    layoutWidth: source instanceof HTMLImageElement && computed?.boxSizing === 'border-box' ? rect.width : width,
    width,
  }
}

async function captureSvgImage(
  snapdom: typeof import('@zumer/snapdom')['snapdom'],
  source: HTMLImageElement,
  size: CaptureSize,
  dpr: number,
) {
  const document = source.ownerDocument
  const computed = document.defaultView?.getComputedStyle(source)
  const wrapper = document.createElement('div')
  const frozen = source.cloneNode(false) as HTMLImageElement
  frozen.src = source.currentSrc || source.getAttribute('src') || ''
  frozen.removeAttribute('srcset')
  frozen.removeAttribute('sizes')
  frozen.removeAttribute('loading')
  frozen.removeAttribute('class')
  frozen.removeAttribute('width')
  frozen.removeAttribute('height')
  frozen.style.cssText = [
    `display:block`,
    `width:${size.width}px`,
    `height:${size.height}px`,
    `max-width:none`,
    `object-fit:${computed?.objectFit || 'fill'}`,
    `object-position:${computed?.objectPosition || '50% 50%'}`,
    `padding:0`,
    `border:0 none transparent`,
    `border-radius:0`,
    `box-shadow:none`,
    `margin:0`,
    `background:transparent`,
  ].join(';')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.cssText = `position:fixed;left:-20000px;top:0;width:${size.width}px;height:${size.height}px;overflow:hidden;pointer-events:none`
  wrapper.append(frozen)
  const parent = document.body || document.documentElement
  parent.append(wrapper)
  try {
    await frozen.decode?.()
    return await snapdom(wrapper, { dpr, embedFonts: true })
  }
  finally {
    wrapper.remove()
  }
}

function replacementImage(
  source: SVGSVGElement | HTMLImageElement,
  clone: SVGSVGElement | HTMLImageElement,
  url: string,
  width: number,
) {
  if (clone instanceof HTMLImageElement) {
    clone.src = url
    clone.removeAttribute('srcset')
    clone.removeAttribute('sizes')
    clone.removeAttribute('loading')
    clone.style.width = `${width}px`
    clone.style.height = 'auto'
    return
  }

  const computed = source.ownerDocument.defaultView?.getComputedStyle(source)
  const image = clone.ownerDocument.createElement('img')
  image.alt = source.getAttribute('aria-label') || source.querySelector('title')?.textContent?.trim() || '图表'
  image.className = [source.getAttribute('class'), 'bm-pdf-svg-diagram'].filter(Boolean).join(' ')
  image.src = url
  image.setAttribute('style', [
    `width:${width}px`,
    `height:auto`,
    `display:${computed?.display || 'inline'}`,
    `vertical-align:${computed?.verticalAlign || 'baseline'}`,
    `margin:${computed?.margin || '0px'}`,
  ].join(';'))
  clone.replaceWith(image)
}

export async function replaceSvgWithImages(sourceRoot: Element, cloneRoot: Element): Promise<string[]> {
  const sources = candidates(sourceRoot)
  const clones = candidates(cloneRoot)
  if (sources.length === 0 || sources.length !== clones.length)
    return []

  const pairs = sources.map((source, index) => ({ clone: clones[index], source }))
  if (pairs.some(({ clone, source }) => identity(source, sourceRoot.ownerDocument.baseURI) !== identity(clone, cloneRoot.ownerDocument.baseURI)))
    return []

  let snapdom: typeof import('@zumer/snapdom')['snapdom']
  try {
    await sourceRoot.ownerDocument.fonts?.ready
    const module = await import('@zumer/snapdom')
    snapdom = module.snapdom
  }
  catch (error) {
    logSafeError('PDF SVG 图片化初始化失败，已保留原图', error)
    return []
  }

  const urls: string[] = []
  for (const { clone, source } of pairs) {
    let url: string | undefined
    try {
      const size = contentSize(source)
      const dpr = getSafeRasterScale(size.width, size.height, 2)
      const snapshot = source instanceof HTMLImageElement
        ? await captureSvgImage(snapdom, source, size, dpr)
        : await snapdom(source, { dpr, embedFonts: true })
      const blob = await snapshot.toBlob({ dpr, type: 'png' })
      if (blob.size === 0)
        throw new Error('SVG snapshot is empty')
      if (blob.size > PDF_IMAGE_MAX_BYTES)
        throw new Error('SVG snapshot exceeds PDF image limit')
      url = URL.createObjectURL(blob)
      replacementImage(source, clone, url, size.layoutWidth)
      urls.push(url)
    }
    catch (error) {
      if (url)
        URL.revokeObjectURL(url)
      logSafeError('PDF SVG 图片化失败，已保留原图', error)
    }
  }
  return urls
}
