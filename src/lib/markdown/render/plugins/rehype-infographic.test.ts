import { renderToString } from '@antv/infographic/ssr'
import { describe, expect, it } from 'vitest'
import { buildInfographicOptions } from './rehype-infographic'

const baseSyntax = `infographic list-row-simple-horizontal-arrow
data
  title 测试`

describe('buildInfographicOptions', () => {
  it('用有效菜单主题和色板覆盖 DSL 配置', () => {
    const result = buildInfographicOptions(baseSyntax, {
      theme: 'dark',
      palette: 'spectral',
    })

    expect(result.theme).toBe('dark')
    expect(result.themeConfig).toEqual({ palette: 'spectral' })
  })

  it('用有效菜单配置覆盖 DSL 中已有的主题和色板', () => {
    const result = buildInfographicOptions(`${baseSyntax}
theme hand-drawn
  palette antv`, {
      theme: 'dark',
      palette: 'spectral',
    })

    expect(result.theme).toBe('dark')
    expect(result.themeConfig).toEqual({ palette: 'spectral' })
  })

  it('保留 palette 之外的 themeConfig，并将无效菜单色板回退为 antv', () => {
    const result = buildInfographicOptions(`${baseSyntax}
theme dark
  palette spectral
  colorPrimary red`, {
      theme: 'invalid',
      palette: 'invalid',
    })

    expect(result.theme).toBe('default')
    expect(result.themeConfig).toEqual({ colorPrimary: 'red', palette: 'antv' })
  })

  it('将缺失的菜单色板回退为 antv', () => {
    const result = buildInfographicOptions(baseSyntax, {})

    expect(result.themeConfig).toEqual({ palette: 'antv' })
  })

  it('保留 DSL 中的深层 themeConfig 配置且不注入字体', () => {
    const result = buildInfographicOptions(`${baseSyntax}
theme dark
  palette spectral
  colorPrimary red
  base
    text
      fill blue`, {
      fontFamily: 'Georgia, serif',
    })

    expect(result.themeConfig).toEqual({
      colorPrimary: 'red',
      palette: 'antv',
      base: { text: { fill: 'blue' } },
    })
  })

  it('生成的选项可由真实 SSR 渲染为 SVG', async () => {
    const syntax = `infographic list-row-simple-horizontal-arrow
data
  lists
    - label 第一步
      desc 开始
    - label 第二步
      desc 完成`
    const options = buildInfographicOptions(syntax, {})

    const result = await renderToString(options)

    expect(result).toContain('<svg')
  }, 10_000)
})
