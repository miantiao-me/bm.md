import { describe, expect, it } from 'vitest'
import {
  getSafeRasterDimensions,
  getSafeRasterScale,
  MAX_RASTER_AREA,
  MAX_RASTER_SIDE,
} from './raster'

function createElement(width: number, height: number): Element {
  return {
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as Element
}

describe('安全栅格尺寸', () => {
  it('短内容保留目标倍率', () => {
    expect(getSafeRasterScale(1000, 800)).toBe(2)
    expect(getSafeRasterDimensions(createElement(1000, 800))).toEqual({
      width: 2000,
      height: 1600,
      scale: 2,
    })
  })

  it('长内容限制高度不超过安全边界', () => {
    const dimensions = getSafeRasterDimensions(createElement(1000, 20_000))

    expect(dimensions.scale).toBe((MAX_RASTER_SIDE - 4) / 20_000)
    expect(dimensions.width).toBe(819)
    expect(dimensions.height).toBeLessThanOrEqual(MAX_RASTER_SIDE - 4)
  })

  it('宽内容限制宽度不超过安全边界', () => {
    const dimensions = getSafeRasterDimensions(createElement(20_000, 1000))

    expect(dimensions.scale).toBe((MAX_RASTER_SIDE - 4) / 20_000)
    expect(dimensions.width).toBeLessThanOrEqual(MAX_RASTER_SIDE - 4)
    expect(dimensions.height).toBe(819)
  })

  it('大正方形限制输出面积不超过安全边界', () => {
    const dimensions = getSafeRasterDimensions(createElement(10_000, 10_000))

    expect(dimensions.width * dimensions.height).toBeLessThanOrEqual(MAX_RASTER_AREA)
  })
})
