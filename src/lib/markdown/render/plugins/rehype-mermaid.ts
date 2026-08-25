import type { ThemeName } from 'beautiful-mermaid'
import { renderMermaid, THEMES } from 'beautiful-mermaid'
import { createSvgRendererPlugin } from './rehype-svg-renderer'
import { applyDiagramFontFamily, makeSvgResponsive } from './svg-style'

export interface RehypeMermaidOptions {
  theme?: string
  /** 图表字体栈，来自 Markdown 排版风格的 diagramFontFamily；缺省保持库默认 */
  fontFamily?: string
}

function isValidTheme(theme: string): theme is ThemeName {
  return theme !== '' && theme in THEMES
}

const rehypeMermaid = createSvgRendererPlugin<RehypeMermaidOptions>({
  languageId: 'mermaid',
  figureClassName: 'figure-mermaid',
  render: async (code, options) => {
    const themeColors = options.theme && isValidTheme(options.theme)
      ? THEMES[options.theme]
      : undefined
    return renderMermaid(code, themeColors)
  },
  adjustSvgStyle: (svgNode, options) => {
    makeSvgResponsive(svgNode)
    // 库默认的 Inter 依赖已被剥离的 Google Fonts @import，实际回退 system-ui；
    // 重写为排版风格栈让图表文字与文档一致，且随 SVG 内部样式进入 PDF 快照。
    applyDiagramFontFamily(svgNode, options.fontFamily)
  },
})

export default rehypeMermaid
