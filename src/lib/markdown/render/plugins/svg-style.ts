import type { Element } from 'hast'

interface ResponsiveSvgOptions {
  visible?: boolean
}

export function makeSvgResponsive(svgNode: Element, options: ResponsiveSvgOptions = {}): void {
  const props = svgNode.properties || {}
  const existingStyle = typeof props.style === 'string' ? props.style : ''
  const width = props.width
  const widthMatch = typeof width === 'string'
    ? width.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/)
    : undefined
  const naturalWidth = typeof width === 'number'
    ? width
    : widthMatch
      ? Number(widthMatch[1])
      : undefined
  const maxWidth = naturalWidth !== undefined && Number.isFinite(naturalWidth) && naturalWidth > 0
    ? `${naturalWidth}px`
    : '100%'
  const responsiveStyle = [
    'width:100%',
    `max-width:${maxWidth}`,
    'height:auto',
    'display:block',
    'margin:0 auto',
    options.visible ? 'visibility:visible' : '',
  ].filter(Boolean).join(';')

  delete props.width
  delete props.height

  props.style = existingStyle
    ? `${existingStyle};${responsiveStyle};`
    : `${responsiveStyle};`
  svgNode.properties = props
}

/**
 * 匹配 SVG 内部 <style> 中 text 规则的 font-family 值。
 * beautiful-mermaid 输出形如 `text { font-family: 'Inter', system-ui, sans-serif; }`，
 * 只替换该规则的值，不触碰 .mono 等其他规则。
 */
const TEXT_FONT_FAMILY_RULE = /(\btext\s*\{[^{}]*?font-family:)\s*([^;{}]+)/g

/**
 * 将图表字体栈写入 SVG 内部 <style> 的 text 规则。
 * SVG 内部样式会随 Snapdom 克隆存活，而外部 CSS 继承不会，
 * 因此 PDF 导出也保持与屏幕一致的字体。仅在显式传入栈时生效。
 */
export function applyDiagramFontFamily(svgNode: Element, fontFamily?: string): void {
  if (!fontFamily) {
    return
  }
  rewriteStyleFontFamily(svgNode, fontFamily)
}

export function applyRootFontFamily(svgNode: Element, fontFamily?: string): void {
  if (fontFamily) {
    svgNode.properties.fontFamily = fontFamily
  }
}

function rewriteStyleFontFamily(node: Element, fontFamily: string): void {
  for (const child of node.children) {
    if (child.type === 'element') {
      rewriteStyleFontFamily(child, fontFamily)
      continue
    }
    if (child.type === 'text' && node.tagName.toLowerCase() === 'style') {
      child.value = child.value.replace(
        TEXT_FONT_FAMILY_RULE,
        (_match, head: string, _value: string) => `${head} ${fontFamily}`,
      )
    }
  }
}
