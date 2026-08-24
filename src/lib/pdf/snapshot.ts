import type { PdfRenderInput } from './protocol'
import { logSafeError } from '@/lib/log-safe-error'
import { createPdfStyles, sanitizeCss, selectBackgroundColor } from './css'
import { isSerifFontFamily, selectFontFamilies } from './fonts'
import { loadImages, resolveImageUrl } from './images'
import { replaceKatexWithImages } from './katex-images'
import { PdfError } from './protocol'
import { replaceSvgWithImages } from './svg-images'

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

export function detectPdfTypography(content: HTMLElement) {
  const view = content.ownerDocument.defaultView
  const heading = content.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6')
  return {
    bodySerif: isSerifFontFamily(view?.getComputedStyle(content).fontFamily ?? ''),
    headingSerif: heading
      ? isSerifFontFamily(view?.getComputedStyle(heading).fontFamily ?? '')
      : undefined,
  }
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
  sourceImages.forEach((image, index) => {
    const src = resolveImageUrl(image.currentSrc, image.getAttribute('src') ?? '', content.ownerDocument.baseURI)
    clonedImages[index].setAttribute('src', src)
    clonedImages[index].removeAttribute('srcset')
    clonedImages[index].removeAttribute('sizes')
    clonedImages[index].removeAttribute('loading')
    if (clonedImages[index].parentElement?.localName === 'picture')
      clonedImages[index].parentElement?.querySelectorAll('source').forEach(source => source.remove())
  })

  const lang = content.ownerDocument.documentElement.lang || 'zh-CN'
  const typography = detectPdfTypography(content)
  const view = content.ownerDocument.defaultView
  const title = clone.querySelector('h1')?.textContent?.trim() || 'bm.md'
  let katexUrls: string[] = []
  let svgUrls: string[] = []
  try {
    katexUrls = await replaceKatexWithImages(content, clone)
    svgUrls = await replaceSvgWithImages(content, clone)
    const imageSources = Array.from(clone.querySelectorAll('img'), image => image.getAttribute('src') ?? '')
      .filter(Boolean)
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
        text: clone.textContent ?? '',
        typography,
        usesCode: Boolean(clone.querySelector('pre, code, kbd, samp')),
      }),
      html: clone.outerHTML,
      images: await loadImages(imageSources),
      lang,
      stylesheets: [
        ...stylesheets(content.ownerDocument).map(sanitizeCss),
        createPdfStyles(typography, lang),
      ],
      title,
    }
  }
  finally {
    for (const url of [...svgUrls, ...katexUrls])
      URL.revokeObjectURL(url)
  }
}
