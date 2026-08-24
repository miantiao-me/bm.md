import type { MarkdownStyleId } from './metadata'
import bauhausCss from './bauhaus.css?inline'
import blueprintCss from './blueprint.css?inline'
import botanicalCss from './botanical.css?inline'
import kamiCss from './kami.css?inline'
import { DEFAULT_MARKDOWN_STYLE_ID } from './metadata'
import newsprintCss from './newsprint.css?inline'
import resetCss from './reset.css?inline'
import retroCss from './retro.css?inline'
import sketchCss from './sketch.css?inline'
import terminalCss from './terminal.css?inline'

const themeCssMap = {
  kami: kamiCss,
  bauhaus: bauhausCss,
  blueprint: blueprintCss,
  botanical: botanicalCss,
  newsprint: newsprintCss,
  retro: retroCss,
  sketch: sketchCss,
  terminal: terminalCss,
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
