import type { Element, Root } from 'hast'
import type { Plugin, Transformer } from 'unified'
import type { RichMetadata } from './rich-metadata'
import rehypeParse from 'rehype-parse'
import { unified } from 'unified'
import { SKIP, visit } from 'unist-util-visit'
import { getClassList, getTextContent } from '@/lib/markdown/hast'
import { createRichMetadata, richData } from './rich-metadata'
import { prefixSvgIds, sanitizeSvgElement } from './svg-safety'

// SVG 解析器，将 SVG 字符串转换为 HAST 节点
const svgParser = unified().use(rehypeParse, { fragment: true })

interface SvgRendererTask {
  parent: Element
  index: number
  code: string
}

interface SvgRendererConfig<TOptions> {
  /** 用于匹配代码块的语言标识（如 'mermaid'、'infographic'） */
  languageId: string
  /** figure 元素的类名前缀（如 'figure-mermaid'） */
  figureClassName: string
  /** 将代码渲染为 SVG 字符串 */
  render: (code: string, options: TOptions) => Promise<string>
  /** 从渲染结果中提取纯 SVG（可选，默认直接返回） */
  extractSvg?: (raw: string) => string
  /** 调整 SVG 节点样式（可选，第二参数为插件选项） */
  adjustSvgStyle?: (svgNode: Element, options: TOptions) => void
}

function isCodeBlock(node: Element, languageId: string): boolean {
  if (node.tagName !== 'pre')
    return false
  const code = node.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  )
  if (!code)
    return false

  const acceptedClasses = new Set([languageId, `language-${languageId}`, `lang-${languageId}`])
  return getClassList(code).some(className => acceptedClasses.has(className))
}

/**
 * 从 pre 元素中提取文本内容
 */
function extractText(pre: Element): string {
  const code = pre.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'code',
  )
  if (!code)
    return ''
  return getTextContent(code)
}

/**
 * 解析 SVG 字符串为 HAST Element
 */
export function parseSvg(svg: string): Element {
  const parsed = svgParser.parse(svg)
  const svgNode = parsed.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'svg',
  )
  if (!svgNode) {
    throw new Error('Failed to parse SVG: no svg element in parsed result')
  }
  return svgNode
}

/**
 * 创建错误状态的 figure 元素
 */
function createErrorFigure(
  figureClassName: string,
  errorMessage: string,
  code: string,
  metadata: RichMetadata,
): Element {
  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      'className': [figureClassName, `${figureClassName}-error`],
      'data-error': errorMessage,
      ...richData(metadata),
    },
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: { className: [`${figureClassName.replace('figure-', '')}-error`] },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: code }],
          },
        ],
      },
    ],
  }
}

/**
 * 创建成功状态的 figure 元素
 */
function createFigure(figureClassName: string, svgNode: Element, metadata: RichMetadata): Element {
  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      className: [figureClassName],
      ...richData(metadata),
    },
    children: [svgNode],
  }
}

function getRichLabel(languageId: string): string {
  if (languageId === 'mermaid') {
    return 'Mermaid 图表'
  }
  if (languageId === 'infographic') {
    return 'Infographic 信息图'
  }
  return `${languageId} 图表`
}

function applySvgAccessibility(svgNode: Element, languageId: string): void {
  const properties = svgNode.properties as Record<string, unknown>
  properties.role = properties.role ?? 'img'
  properties['aria-label'] = properties['aria-label'] ?? getRichLabel(languageId)
}

/**
 * 创建通用的 SVG 渲染 rehype 插件
 */
export function createSvgRendererPlugin<TOptions>(
  config: SvgRendererConfig<TOptions>,
): Plugin<[TOptions?], Root> {
  const { languageId, figureClassName, render, extractSvg, adjustSvgStyle } = config

  return (options = {} as TOptions) => {
    const transformer: Transformer<Root> = async (tree) => {
      const tasks: SvgRendererTask[] = []

      visit(tree, 'element', (node, index, parent) => {
        if (!parent || typeof index !== 'number')
          return
        if (!isCodeBlock(node as Element, languageId))
          return

        const code = extractText(node as Element)
        if (!code.trim())
          return

        tasks.push({ parent: parent as Element, index, code })
        return SKIP
      })

      if (tasks.length === 0) {
        return
      }

      await Promise.all(
        tasks.map(async ({ parent, index, code }, ordinal) => {
          const metadata = createRichMetadata(languageId, code)

          try {
            const svgRaw = await render(code, options)
            const svg = extractSvg ? extractSvg(svgRaw) : svgRaw
            const svgNode = parseSvg(svg)

            sanitizeSvgElement(svgNode)
            prefixSvgIds(svgNode, `bm-${languageId}-${metadata.hash}-${ordinal}-`)

            if (adjustSvgStyle) {
              adjustSvgStyle(svgNode, options)
            }

            applySvgAccessibility(svgNode, languageId)
            parent.children.splice(index, 1, createFigure(figureClassName, svgNode, metadata))
          }
          catch (error) {
            console.error(`${languageId} render error:`, error)
            const errorMessage = error instanceof Error ? error.message : 'Render failed'
            parent.children.splice(index, 1, createErrorFigure(figureClassName, errorMessage, code, metadata))
          }
        }),
      )
    }

    return transformer
  }
}
