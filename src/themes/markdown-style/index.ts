/**
 * Markdown preview styles for Ayu theme
 * Import CSS files using Vite
 */

import ayuLightCss from './ayu-light.css?raw'
import bauhausCss from './bauhaus.css?raw'
import blueprintCss from './blueprint.css?raw'
import botanicalCss from './botanical.css?raw'
import greenSimpleCss from './green-simple.css?raw'
import maximalismCss from './maximalism.css?raw'
import neoBrutalismCss from './neo-brutalism.css?raw'
import newsprintCss from './newsprint.css?raw'
import organicCss from './organic.css?raw'
import playfulGeometricCss from './playful-geometric.css?raw'
import professionalCss from './professional.css?raw'
import resetCss from './reset.css?raw'
import retroCss from './retro.css?raw'
import sketchCss from './sketch.css?raw'
import terminalCss from './terminal.css?raw'

export interface MarkdownStyle {
  id: string
  name: string
  css: string
}

/**
 * Available markdown styles
 */
export const markdownStyles: MarkdownStyle[] = [
  {
    id: 'ayu-light',
    name: 'Ayu Light',
    css: resetCss + ayuLightCss,
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus',
    css: resetCss + bauhausCss,
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    css: resetCss + blueprintCss,
  },
  {
    id: 'botanical',
    name: 'Botanical',
    css: resetCss + botanicalCss,
  },
  {
    id: 'green-simple',
    name: 'GreenSimple',
    css: resetCss + greenSimpleCss,
  },
  {
    id: 'maximalism',
    name: 'Maximalism',
    css: resetCss + maximalismCss,
  },
  {
    id: 'neo-brutalism',
    name: 'Neo-Brutalism',
    css: resetCss + neoBrutalismCss,
  },
  {
    id: 'newsprint',
    name: 'Newsprint',
    css: resetCss + newsprintCss,
  },
  {
    id: 'organic',
    name: 'Organic',
    css: resetCss + organicCss,
  },
  {
    id: 'playful-geometric',
    name: 'Playful Geometric',
    css: resetCss + playfulGeometricCss,
  },
  {
    id: 'professional',
    name: 'Professional',
    css: resetCss + professionalCss,
  },
  {
    id: 'retro',
    name: 'Retro',
    css: resetCss + retroCss,
  },
  {
    id: 'sketch',
    name: 'Sketch',
    css: resetCss + sketchCss,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    css: resetCss + terminalCss,
  },
]

export const markdownStyleIds = markdownStyles.map(s => s.id) as [string, ...string[]]

export type MarkdownStyleId = (typeof markdownStyles)[number]['id']

/**
 * Get markdown style by ID
 */
export function getMarkdownStyleById(id: string): MarkdownStyle | undefined {
  return markdownStyles.find(style => style.id === id)
}
