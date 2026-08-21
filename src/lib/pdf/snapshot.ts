import type { PdfRenderInput } from './protocol'
import { logSafeError } from '@/lib/log-safe-error'
import { createPdfStyles, sanitizeCss, selectBackgroundColor } from './css'
import { selectFontFamilies } from './fonts'
import { loadImages, resolveImageUrl } from './images'
import { PdfError } from './protocol'

function stylesheets(document: Document): string[] {
  const result: string[] = []
  for (const stylesheet of document.styleSheets) {
    try {
      result.push(Array.from(stylesheet.cssRules, rule => rule.cssText).join('\n'))
    }
    catch (error) {
      logSafeError('PDF 预览样式读取失败', error)
      throw new PdfError('snapshotFailed', '无法读取预览样式，请刷新后重试', { cause: error })
    }
  }
  return result
}

function usesSerif(content: HTMLElement): boolean {
  const family = content.ownerDocument.defaultView?.getComputedStyle(content).fontFamily.toLowerCase() ?? ''
  return family.split(',').some((name) => {
    const normalized = name.trim().replace(/^['"]|['"]$/g, '')
    return normalized === 'serif'
      || normalized.includes('song')
      || normalized.includes('ming')
      || normalized.includes('georgia')
  })
}

export async function createPdfSnapshot(content: HTMLElement): Promise<PdfRenderInput> {
  const clone = content.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script').forEach(script => script.remove())
  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>('[style]')]) {
    const style = element.getAttribute('style')
    if (style === null)
      continue
    const sanitized = sanitizeCss(style)
    if (sanitized.trim())
      element.setAttribute('style', sanitized)
    else
      element.removeAttribute('style')
  }
  clone.querySelectorAll('style').forEach((style) => {
    style.textContent = sanitizeCss(style.textContent ?? '')
  })

  const sourceImages = Array.from(content.querySelectorAll('img'))
  const clonedImages = Array.from(clone.querySelectorAll('img'))
  const imageSources = sourceImages.map((image, index) => {
    const src = resolveImageUrl(image.currentSrc, image.getAttribute('src') ?? '', content.ownerDocument.baseURI)
    clonedImages[index].setAttribute('src', src)
    clonedImages[index].removeAttribute('srcset')
    clonedImages[index].removeAttribute('loading')
    return src
  })

  const lang = content.ownerDocument.documentElement.lang || 'zh-CN'
  const serif = usesSerif(content)
  const view = content.ownerDocument.defaultView
  return {
    backgroundColor: selectBackgroundColor([
      view?.getComputedStyle(content).backgroundColor ?? '',
      view?.getComputedStyle(content.ownerDocument.body).backgroundColor ?? '',
      view?.getComputedStyle(content.ownerDocument.documentElement).backgroundColor ?? '',
    ]),
    fontFamilies: selectFontFamilies({
      lang,
      languages: Array.from(clone.querySelectorAll('[lang]'), element => element.getAttribute('lang') ?? '')
        .filter(Boolean),
      serif,
      text: clone.textContent ?? '',
      usesCode: Boolean(clone.querySelector('pre, code, kbd, samp')),
    }),
    html: clone.outerHTML,
    images: await loadImages(imageSources),
    lang,
    stylesheets: [
      ...stylesheets(content.ownerDocument).map(sanitizeCss),
      createPdfStyles(serif, lang),
    ],
    title: clone.querySelector('h1')?.textContent?.trim() || 'bm.md',
  }
}
