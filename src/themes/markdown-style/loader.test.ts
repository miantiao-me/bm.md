import type { MarkdownStyleId } from './metadata'
import { describe, expect, it, vi } from 'vitest'
import bauhausCss from './bauhaus.css?inline'
import blackLedgerCss from './black-ledger.css?inline'
import blueprintCss from './blueprint.css?inline'
import botanicalCss from './botanical.css?inline'
import fieldTabletCss from './field-tablet.css?inline'
import forestReviewCss from './forest-review.css?inline'
import kamiCss from './kami.css?inline'
import { loadMarkdownStyleCss } from './loader'
import { DEFAULT_MARKDOWN_STYLE_ID, markdownStyleIds } from './metadata'
import navyVellumCss from './navy-vellum.css?inline'
import newsprintCss from './newsprint.css?inline'
import pixelOrbitCss from './pixel-orbit.css?inline'
import publicSquareCss from './public-square.css?inline'
import resetCss from './reset.css?inline'
import retroCss from './retro.css?inline'
import roseNocturneCss from './rose-nocturne.css?inline'
import sketchCss from './sketch.css?inline'
import solarCatalogCss from './solar-catalog.css?inline'
import terminalCss from './terminal.css?inline'
import triadPaperCss from './triad-paper.css?inline'

const cssFixtures = vi.hoisted(() => ({
  'reset': '#bm-md { box-sizing: border-box; }',
  'kami': '#bm-md { color: #141413; }',
  'bauhaus': '#bm-md { color: #151515; }',
  'blueprint': '#bm-md { color: #123456; }',
  'botanical': '#bm-md { color: #234567; }',
  'newsprint': '#bm-md { color: #345678; }',
  'retro': '#bm-md { color: #456789; }',
  'sketch': '#bm-md { color: #56789a; }',
  'terminal': '#bm-md { color: #6789ab; }',
  'black-ledger': '#bm-md { color: #1a1a16; }',
  'forest-review': '#bm-md { color: #1a1a17; }',
  'navy-vellum': '#bm-md { color: #e8d85c; }',
  'rose-nocturne': '#bm-md { color: #f5edf1; }',
  'solar-catalog': '#bm-md { color: #1b2566; }',
  'triad-paper': '#bm-md { color: #f2d86a; }',
  'field-tablet': '#bm-md { color: #0a0a0a; }',
  'public-square': '#bm-md { color: #0e0e14; }',
  'pixel-orbit': '#bm-md { color: #5edcf4; }',
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
vi.mock('./black-ledger.css?inline', () => ({ default: cssFixtures['black-ledger'] }))
vi.mock('./forest-review.css?inline', () => ({ default: cssFixtures['forest-review'] }))
vi.mock('./navy-vellum.css?inline', () => ({ default: cssFixtures['navy-vellum'] }))
vi.mock('./rose-nocturne.css?inline', () => ({ default: cssFixtures['rose-nocturne'] }))
vi.mock('./solar-catalog.css?inline', () => ({ default: cssFixtures['solar-catalog'] }))
vi.mock('./triad-paper.css?inline', () => ({ default: cssFixtures['triad-paper'] }))
vi.mock('./field-tablet.css?inline', () => ({ default: cssFixtures['field-tablet'] }))
vi.mock('./public-square.css?inline', () => ({ default: cssFixtures['public-square'] }))
vi.mock('./pixel-orbit.css?inline', () => ({ default: cssFixtures['pixel-orbit'] }))

const expectedThemeCss = {
  'kami': kamiCss,
  'bauhaus': bauhausCss,
  'blueprint': blueprintCss,
  'botanical': botanicalCss,
  'newsprint': newsprintCss,
  'retro': retroCss,
  'sketch': sketchCss,
  'terminal': terminalCss,
  'black-ledger': blackLedgerCss,
  'forest-review': forestReviewCss,
  'navy-vellum': navyVellumCss,
  'rose-nocturne': roseNocturneCss,
  'solar-catalog': solarCatalogCss,
  'triad-paper': triadPaperCss,
  'field-tablet': fieldTabletCss,
  'public-square': publicSquareCss,
  'pixel-orbit': pixelOrbitCss,
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
