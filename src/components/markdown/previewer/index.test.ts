import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('预览模式生命周期', () => {
  it('容器尺寸变化不自动切换预览模式', () => {
    const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('ResizeObserver')
    expect(source).not.toContain('setPreviewWidth')
    expect(source).not.toContain('userPreferredWidth')
  })

  it('显式切换预览宽度仍会重建 iframe', () => {
    const source = readFileSync(new URL('./render.tsx', import.meta.url), 'utf8')
    const controller = readFileSync(new URL('./use-preview-controller.ts', import.meta.url), 'utf8')

    expect(controller).toMatch(/const iframeKey = `\$\{contentFileId \?\? 'none'\}:\$\{previewWidth\}`/)
    expect(source).toContain('key={iframeKey}')
  })
})
