/**
 * Code theme styles for highlight.js
 * Import CSS files using Vite inline
 */

import catppuccinFrappeCss from '@catppuccin/highlightjs/css/catppuccin-frappe.css?raw'
import catppuccinLatteCss from '@catppuccin/highlightjs/css/catppuccin-latte.css?raw'
import catppuccinMacchiatoCss from '@catppuccin/highlightjs/css/catppuccin-macchiato.css?raw'
import catppuccinMochaCss from '@catppuccin/highlightjs/css/catppuccin-mocha.css?raw'
import kimbieDarkCss from 'highlight.js/styles/kimbie-dark.css?raw'
import kimbieLightCss from 'highlight.js/styles/kimbie-light.css?raw'
import pandaSyntaxDarkCss from 'highlight.js/styles/panda-syntax-dark.css?raw'
import pandaSyntaxLightCss from 'highlight.js/styles/panda-syntax-light.css?raw'
import paraisoDarkCss from 'highlight.js/styles/paraiso-dark.css?raw'
import paraisoLightCss from 'highlight.js/styles/paraiso-light.css?raw'
import rosePineDawnCss from 'highlight.js/styles/rose-pine-dawn.css?raw'
import rosePineCss from 'highlight.js/styles/rose-pine.css?raw'
import tokyoNightDarkCss from 'highlight.js/styles/tokyo-night-dark.css?raw'
import tokyoNightLightCss from 'highlight.js/styles/tokyo-night-light.css?raw'

export interface CodeTheme {
  id: string
  name: string
  css: string
  isDark: boolean
}

/**
 * Available code themes from highlight.js
 */
export const codeThemes: CodeTheme[] = [
  { id: 'catppuccin-frappe', name: 'Catppuccin Frappé', css: catppuccinFrappeCss, isDark: true },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', css: catppuccinLatteCss, isDark: false },
  { id: 'catppuccin-macchiato', name: 'Catppuccin Macchiato', css: catppuccinMacchiatoCss, isDark: true },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', css: catppuccinMochaCss, isDark: true },
  { id: 'kimbie-dark', name: 'Kimbie Dark', css: kimbieDarkCss, isDark: true },
  { id: 'kimbie-light', name: 'Kimbie Light', css: kimbieLightCss, isDark: false },
  { id: 'panda-syntax-dark', name: 'Panda Syntax Dark', css: pandaSyntaxDarkCss, isDark: true },
  { id: 'panda-syntax-light', name: 'Panda Syntax Light', css: pandaSyntaxLightCss, isDark: false },
  { id: 'paraiso-dark', name: 'Paraiso Dark', css: paraisoDarkCss, isDark: true },
  { id: 'paraiso-light', name: 'Paraiso Light', css: paraisoLightCss, isDark: false },
  { id: 'rose-pine', name: 'Rosé Pine', css: rosePineCss, isDark: true },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', css: rosePineDawnCss, isDark: false },
  { id: 'tokyo-night-dark', name: 'Tokyo Night Dark', css: tokyoNightDarkCss, isDark: true },
  { id: 'tokyo-night-light', name: 'Tokyo Night Light', css: tokyoNightLightCss, isDark: false },
]

export const codeThemeIds = codeThemes.map(t => t.id) as [string, ...string[]]

export type CodeThemeId = (typeof codeThemes)[number]['id']

/**
 * Get code theme by ID
 */
export function getCodeThemeById(id: string): CodeTheme | undefined {
  return codeThemes.find(theme => theme.id === id)
}
