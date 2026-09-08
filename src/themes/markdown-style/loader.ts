import type { MarkdownStyleId } from './metadata'
import bauhausCss from './bauhaus.css?inline'
import blueprintCss from './blueprint.css?inline'
import botanicalCss from './botanical.css?inline'
import fieldTabletCss from './field-tablet.css?inline'
import forestReviewCss from './forest-review.css?inline'
import kamiCss from './kami.css?inline'
import { DEFAULT_MARKDOWN_STYLE_ID } from './metadata'
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

const themeCssMap = {
  'kami': kamiCss,
  'bauhaus': bauhausCss,
  'blueprint': blueprintCss,
  'botanical': botanicalCss,
  'newsprint': newsprintCss,
  'retro': retroCss,
  'sketch': sketchCss,
  'terminal': terminalCss,
  'forest-review': forestReviewCss,
  'navy-vellum': navyVellumCss,
  'rose-nocturne': roseNocturneCss,
  'solar-catalog': solarCatalogCss,
  'triad-paper': triadPaperCss,
  'field-tablet': fieldTabletCss,
  'public-square': publicSquareCss,
  'pixel-orbit': pixelOrbitCss,
} satisfies Record<MarkdownStyleId, string>

function isMarkdownStyleId(id: string): id is MarkdownStyleId {
  return Object.hasOwn(themeCssMap, id)
}

export function loadMarkdownStyleCss(id: string): string {
  const themeCss = isMarkdownStyleId(id)
    ? themeCssMap[id]
    : themeCssMap[DEFAULT_MARKDOWN_STYLE_ID]
  return resetCss + themeCss
}
