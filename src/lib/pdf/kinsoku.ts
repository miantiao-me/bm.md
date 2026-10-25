const CLOSING_PUNCTUATION = /^[，。、：；！？）］｝〕〉》」』】〗’”…]+/
const INLINE_ELEMENTS = new Set(['a', 'abbr', 'b', 'code', 'del', 'em', 'i', 'img', 'ins', 'kbd', 'mark', 'q', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'])
// inline-block 内部不再折行，太长的元素宁可让标点落到行首，也不要整块挪到下一行留下大段空白。
const MAX_GROUPED_TEXT_LENGTH = 20

/**
 * Takumi 在带内边距或边框的行内元素（行内代码、按键、高亮）结束处总会留一个断行点，
 * 紧跟的“，”“、”可能被挤到下一行行首；nowrap 和 U+2060 都挡不住，只有把元素和标点一起包进 inline-block。
 */
export function keepClosingPunctuationAttached(root: HTMLElement): void {
  const document = root.ownerDocument
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  while (walker.nextNode())
    texts.push(walker.currentNode as Text)

  for (const text of texts) {
    const punctuation = text.data.match(CLOSING_PUNCTUATION)?.[0]
    if (!punctuation || text.parentElement?.closest('pre'))
      continue
    // 预览会把元素之间的文字包进不带样式的 span，标点要连同这个 span 一起挪。
    const host = !text.previousSibling && text.parentElement?.localName === 'span' && !text.parentElement.attributes.length
      ? text.parentElement
      : text
    // 克隆节点属于预览 iframe 的文档，跨 realm 不能用 instanceof Element 判断。
    const previous = host.previousSibling as Element | null
    if (previous?.nodeType !== Node.ELEMENT_NODE || !INLINE_ELEMENTS.has(previous.localName)
      || (previous.textContent ?? '').length > MAX_GROUPED_TEXT_LENGTH) {
      continue
    }

    const group = document.createElement('span')
    group.setAttribute('style', 'display: inline-block')
    previous.before(group)
    const head = host.cloneNode(false)
    head.textContent = punctuation
    group.append(previous, head)
    text.data = text.data.slice(punctuation.length)
    if (!text.data)
      host.remove()
  }
}
