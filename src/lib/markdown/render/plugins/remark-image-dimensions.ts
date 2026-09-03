import type { Image, Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const IMAGE_DIMENSIONS_SUFFIX = /^(.*)\|([1-9]\d*)(?:x([1-9]\d*))?$/

interface ImageDimensions {
  alt: string
  width: string
  height?: string
}

function parseImageDimensions(alt: string): ImageDimensions | undefined {
  const match = IMAGE_DIMENSIONS_SUFFIX.exec(alt)
  if (!match)
    return

  return {
    alt: match[1],
    width: match[2],
    ...(match[3] ? { height: match[3] } : {}),
  }
}

function applyImageDimensions(node: Image): void {
  const dimensions = parseImageDimensions(node.alt ?? '')
  if (!dimensions)
    return

  node.alt = dimensions.alt
  node.data = {
    ...node.data,
    hProperties: {
      ...node.data?.hProperties,
      width: dimensions.width,
      ...(dimensions.height ? { height: dimensions.height } : {}),
    },
  }
}

const remarkImageDimensions: Plugin<[], Root> = () => tree => visit(tree, 'image', applyImageDimensions)

export default remarkImageDimensions
