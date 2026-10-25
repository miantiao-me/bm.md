import type { PdfRenderInput } from './protocol'
import { LIST_MARKER_CHARACTERS } from '@takumi-rs/helpers'
import { logSafeError } from '@/lib/log-safe-error'
import { createPdfStyles, sanitizeCss, selectBackgroundColor } from './css'
import { shuffleUniqueCharacters } from './emfont'
import { languageFontStyle } from './font-map'
import { collectFontUsages, MISSING_GLYPH_REPLACEMENT, selectFontFamilies } from './fonts'
import { loadImages, resolveImageUrl } from './images'
import { replaceKatexWithImages } from './katex-images'
import { keepClosingPunctuationAttached } from './kinsoku'
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

export async function createPdfSnapshot(content: HTMLElement): Promise<PdfRenderInput> {
  const lang = content.ownerDocument.documentElement.lang || 'zh-CN'
  const view = content.ownerDocument.defaultView
  const elements = [content, ...content.querySelectorAll<HTMLElement>('*')]
  const fontUsages = collectFontUsages(elements.map((element) => {
    const computed = view?.getComputedStyle(element)
    return {
      fontFamily: computed?.fontFamily || 'sans-serif',
      fontWeight: Number.parseInt(computed?.fontWeight || '400', 10) || (computed?.fontWeight === 'bold' ? 700 : 400),
      italic: computed?.fontStyle === 'italic' || computed?.fontStyle === 'oblique',
      lang: element.closest('[lang]')?.getAttribute('lang') || lang,
    }
  }), lang)
  const clone = content.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script').forEach(script => script.remove())
  const sourceLangElements = content.querySelectorAll<HTMLElement>('[lang]')
  clone.querySelectorAll<HTMLElement>('[lang]').forEach((element, index) => {
    const fontFamily = view?.getComputedStyle(sourceLangElements[index]).fontFamily
    if (!fontFamily)
      return
    const style = element.getAttribute('style')?.trim().replace(/;?$/, ';') ?? ''
    element.setAttribute('style', `${style}${languageFontStyle(fontFamily, element.getAttribute('lang') || lang)}`)
  })
  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>('[style]')]) {
    const style = element.getAttribute('style')
    if (style === null)
      continue
    const sanitized = sanitizeCss(style, lang)
    if (sanitized.trim())
      element.setAttribute('style', sanitized)
    else
      element.removeAttribute('style')
  }
  clone.querySelectorAll('style').forEach((style) => {
    style.textContent = sanitizeCss(style.textContent ?? '', lang)
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

  const title = clone.querySelector('h1')?.textContent?.trim() || 'bm.md'
  let katexUrls: string[] = []
  let svgUrls: string[] = []
  try {
    katexUrls = await replaceKatexWithImages(content, clone)
    svgUrls = await replaceSvgWithImages(content, clone)
    keepClosingPunctuationAttached(clone)
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
        fontUsages,
        usesCode: Boolean(clone.querySelector('pre, code, kbd, samp')),
      }),
      fontUsages,
      // emfont 只下发这里列出的字，缺字最后会替换成方框，所以方框本身也要带上。
      fontChars: shuffleUniqueCharacters((clone.textContent ?? '') + LIST_MARKER_CHARACTERS + MISSING_GLYPH_REPLACEMENT),
      html: clone.outerHTML,
      images: await loadImages(imageSources),
      lang,
      stylesheets: [
        ...stylesheets(content.ownerDocument).map(css => sanitizeCss(css, lang)),
        createPdfStyles(),
      ],
      title,
    }
  }
  finally {
    for (const url of [...svgUrls, ...katexUrls])
      URL.revokeObjectURL(url)
  }
}
