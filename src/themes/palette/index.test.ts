import { describe, expect, it } from 'vitest'
import { ayuLight, ayuMirage } from './index'

/**
 * CodeMirror 的选区高亮层（.cm-selectionLayer）绘制在内容层之下，
 * 若 activeLine 背景不透明会遮挡光标所在行的选区高亮（深色主题曾因此失效）。
 * 因此 activeLine 必须是带 alpha 的半透明色，且保留可见性（alpha 不为 0）。
 */
function expectTranslucentActiveLine(activeLine: string, name: string) {
  const match = /^#([0-9a-f]{8})$/i.exec(activeLine)
  expect(match, `${name} 的 activeLine 应为 8 位十六进制（含 alpha）：${activeLine}`).not.toBeNull()
  const alpha = Number.parseInt(match![1].slice(6, 8), 16)
  expect(alpha, `${name} 的 activeLine alpha 应在 1~254 之间（可见但不遮挡选区）`).toBeGreaterThan(0)
  expect(alpha).toBeLessThan(255)
}

describe('主题调色板 activeLine', () => {
  it('深色主题（ayuMirage）activeLine 为半透明，避免遮挡选区高亮', () => {
    expectTranslucentActiveLine(ayuMirage.activeLine, 'ayuMirage')
  })

  it('浅色主题（ayuLight）activeLine 保持半透明', () => {
    expectTranslucentActiveLine(ayuLight.activeLine, 'ayuLight')
  })
})
