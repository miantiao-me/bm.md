/**
 * Code theme styles for highlight.js
 * Import CSS files using Vite inline
 */

import kimbieDarkCss from 'highlight.js/styles/kimbie-dark.css?raw'
// Kimbie
import kimbieLightCss from 'highlight.js/styles/kimbie-light.css?raw'
import pandaSyntaxDarkCss from 'highlight.js/styles/panda-syntax-dark.css?raw'
// Panda Syntax
import pandaSyntaxLightCss from 'highlight.js/styles/panda-syntax-light.css?raw'
import paraisoDarkCss from 'highlight.js/styles/paraiso-dark.css?raw'
// Paraiso
import paraisoLightCss from 'highlight.js/styles/paraiso-light.css?raw'
// Rosé Pine
import rosePineDawnCss from 'highlight.js/styles/rose-pine-dawn.css?raw'
import rosePineCss from 'highlight.js/styles/rose-pine.css?raw'
import tokyoNightDarkCss from 'highlight.js/styles/tokyo-night-dark.css?raw'
// Tokyo Night
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
  { id: 'tokyo-night-light', name: 'Tokyo Night Light', css: tokyoNightLightCss, isDark: false },
  { id: 'tokyo-night-dark', name: 'Tokyo Night Dark', css: tokyoNightDarkCss, isDark: true },
  { id: 'panda-syntax-light', name: 'Panda Syntax Light', css: pandaSyntaxLightCss, isDark: false },
  { id: 'panda-syntax-dark', name: 'Panda Syntax Dark', css: pandaSyntaxDarkCss, isDark: true },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', css: rosePineDawnCss, isDark: false },
  { id: 'rose-pine', name: 'Rosé Pine', css: rosePineCss, isDark: true },
  { id: 'kimbie-light', name: 'Kimbie Light', css: kimbieLightCss, isDark: false },
  { id: 'kimbie-dark', name: 'Kimbie Dark', css: kimbieDarkCss, isDark: true },
  { id: 'paraiso-light', name: 'Paraiso Light', css: paraisoLightCss, isDark: false },
  { id: 'paraiso-dark', name: 'Paraiso Dark', css: paraisoDarkCss, isDark: true },
]

/**
 * Get code theme by ID
 */
export function getCodeThemeById(id: string): CodeTheme | undefined {
  return codeThemes.find(theme => theme.id === id)
}
