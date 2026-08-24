import type { MarkdownStyleId } from './metadata'
import { describe, expect, it, vi } from 'vitest'
import bauhausCss from './bauhaus.css?inline'
import blueprintCss from './blueprint.css?inline'
import botanicalCss from './botanical.css?inline'
import kamiCss from './kami.css?inline'
import { loadMarkdownStyleCss } from './loader'
import { DEFAULT_MARKDOWN_STYLE_ID, markdownStyleIds } from './metadata'
import newsprintCss from './newsprint.css?inline'
import resetCss from './reset.css?inline'
import retroCss from './retro.css?inline'
import sketchCss from './sketch.css?inline'
import terminalCss from './terminal.css?inline'

const cssFixtures = vi.hoisted(() => ({
  reset: '#bm-md { box-sizing: border-box; }',
  kami: '#bm-md { color: #141413; }',
  bauhaus: '#bm-md { color: #151515; }',
  blueprint: '#bm-md { color: #123456; }',
  botanical: '#bm-md { color: #234567; }',
  newsprint: '#bm-md { color: #345678; }',
  retro: '#bm-md { color: #456789; }',
  sketch: '#bm-md { color: #56789a; }',
  terminal: '#bm-md { color: #6789ab; }',
}))

vi.mock('./reset.css?inline', () => ({ default: cssFixtures.reset }))
vi.mock('./kami.css?inline', () => ({ default: cssFixtures.kami }))
vi.mock('./bauhaus.css?inline', () => ({ default: cssFixtures.bauhaus }))
vi.mock('./blueprint.css?inline', () => ({ default: cssFixtures.blueprint }))
vi.mock('./botanical.css?inline', () => ({ default: cssFixtures.botanical }))
vi.mock('./newsprint.css?inline', () => ({ default: cssFixtures.newsprint }))
vi.mock('./retro.css?inline', () => ({ default: cssFixtures.retro }))
vi.mock('./sketch.css?inline', () => ({ default: cssFixtures.sketch }))
vi.mock('./terminal.css?inline', () => ({ default: cssFixtures.terminal }))

const expectedThemeCss = {
  kami: kamiCss,
  bauhaus: bauhausCss,
  blueprint: blueprintCss,
  botanical: botanicalCss,
  newsprint: newsprintCss,
  retro: retroCss,
  sketch: sketchCss,
  terminal: terminalCss,
} satisfies Record<MarkdownStyleId, string>

describe('loadMarkdownStyleCss', () => {
  it.each(markdownStyleIds)('加载主题 %s 及重置样式', (id) => {
    const themeCss = expectedThemeCss[id]

    expect(themeCss.trim()).not.toBe('')
    expect(loadMarkdownStyleCss(id)).toBe(resetCss + themeCss)
  })

  it('未知主题回退到默认主题', () => {
    expect(loadMarkdownStyleCss('unknown')).toBe(loadMarkdownStyleCss(DEFAULT_MARKDOWN_STYLE_ID))
  })
})
