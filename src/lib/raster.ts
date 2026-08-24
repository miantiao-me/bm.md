export const MAX_RASTER_SIDE = 16_384
export const MAX_RASTER_AREA = 32 * 1024 * 1024

const RASTER_SAFETY_MARGIN = 4
const SAFE_RASTER_SIDE = MAX_RASTER_SIDE - RASTER_SAFETY_MARGIN

export interface RasterDimensions {
  height: number
  scale: number
  width: number
}

export function getSafeRasterScale(
  sourceWidth: number,
  sourceHeight: number,
  targetScale = 2,
): number {
  return Math.min(
    targetScale,
    SAFE_RASTER_SIDE / Math.max(1, sourceWidth),
    SAFE_RASTER_SIDE / Math.max(1, sourceHeight),
    Math.sqrt(MAX_RASTER_AREA / Math.max(1, sourceWidth * sourceHeight)),
  )
}

export function getSafeRasterDimensions(
  element: Element,
  targetScale = 2,
): RasterDimensions {
  const rect = element.getBoundingClientRect()
  const sourceWidth = Math.max(1, rect.width)
  const sourceHeight = Math.max(1, rect.height)
  const scale = getSafeRasterScale(sourceWidth, sourceHeight, targetScale)

  return {
    height: Math.max(1, Math.floor(sourceHeight * scale)),
    scale,
    width: Math.max(1, Math.floor(sourceWidth * scale)),
  }
}
