import { describe, expect, it } from 'vitest'
import { getScrollRatio, getScrollTop } from './scroll-ratio'

describe('滚动比例运算', () => {
  it.each([
    [1000, 200, 400, 0.5],
    [200, 200, 0, 0],
    [100, 200, 20, 0],
    [1000, 200, -80, -0.1],
    [1000, 200, 880, 1.1],
  ])('保留尺寸 %s/%s、位置 %s 的比例计算', (scrollHeight, clientHeight, scrollTop, expected) => {
    expect(getScrollRatio({ scrollHeight, clientHeight, scrollTop })).toBe(expected)
  })

  it('位置计算保持原来的乘法，不钳制或修改输入', () => {
    const metrics = Object.freeze({ scrollHeight: 1000, clientHeight: 200 })
    expect(getScrollTop(metrics, 0.5)).toBe(400)
    expect(getScrollTop(metrics, 1.1)).toBeCloseTo(880)
    expect(getScrollTop(metrics, -0.1)).toBe(-80)
    expect(getScrollTop({ scrollHeight: 100, clientHeight: 200 }, 0.5)).toBe(-50)
  })
})
