import { parseSyntax } from '@antv/infographic'
import { renderToString } from '@antv/infographic/ssr'
import { isValidPalette, isValidTheme } from '@/themes/infographic-theme'
import { createSvgRendererPlugin } from './rehype-svg-renderer'
import { applyRootFontFamily, makeSvgResponsive } from './svg-style'

export interface RehypeInfographicOptions {
  theme?: string
  palette?: string
  /** 图表字体栈，来自 Markdown 排版风格的 diagramFontFamily；缺省保持库默认 */
  fontFamily?: string
}

type SsrInfographicOptions = Exclude<Parameters<typeof renderToString>[0], string>

function extractSvgContent(svgString: string): string {
  const svgMatch = svgString.match(/<svg[\s\S]*<\/svg>/i)
  if (!svgMatch) {
    throw new Error('未找到 SVG 输出')
  }

  return svgMatch[0]
}

export function buildInfographicOptions(
  code: string,
  options: RehypeInfographicOptions,
): SsrInfographicOptions {
  const { theme, palette } = options
  const parsedOptions = parseSyntax(code).options
  const themeConfig = {
    ...parsedOptions.themeConfig,
    palette: palette && isValidPalette(palette) ? palette : 'antv',
  }

  // 该包的解析器与 SSR 入口分别引用 ESM/CJS 类型，但运行时结构相同。
  return {
    ...parsedOptions,
    theme: theme && isValidTheme(theme) ? theme : 'default',
    themeConfig,
  } as SsrInfographicOptions
}

const rehypeInfographic = createSvgRendererPlugin<RehypeInfographicOptions>({
  languageId: 'infographic',
  figureClassName: 'figure-infographic',
  render: async (code, options) => {
    const infographicOptions = buildInfographicOptions(code, options)
    return renderToString(infographicOptions)
  },
  extractSvg: extractSvgContent,
  adjustSvgStyle: (svgNode, options) => {
    applyRootFontFamily(svgNode, options.fontFamily)
    makeSvgResponsive(svgNode, { visible: true })
  },
})

export default rehypeInfographic
