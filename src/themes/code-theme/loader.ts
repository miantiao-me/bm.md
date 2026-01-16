const cache = new Map<string, string>()

const themeModules: Record<string, () => Promise<{ default: string }>> = {
  'catppuccin-frappe': () => import('@catppuccin/highlightjs/css/catppuccin-frappe.css?raw'),
  'catppuccin-latte': () => import('@catppuccin/highlightjs/css/catppuccin-latte.css?raw'),
  'catppuccin-macchiato': () => import('@catppuccin/highlightjs/css/catppuccin-macchiato.css?raw'),
  'catppuccin-mocha': () => import('@catppuccin/highlightjs/css/catppuccin-mocha.css?raw'),
  'kimbie-dark': () => import('highlight.js/styles/kimbie-dark.css?raw'),
  'kimbie-light': () => import('highlight.js/styles/kimbie-light.css?raw'),
  'panda-syntax-dark': () => import('highlight.js/styles/panda-syntax-dark.css?raw'),
  'panda-syntax-light': () => import('highlight.js/styles/panda-syntax-light.css?raw'),
  'paraiso-dark': () => import('highlight.js/styles/paraiso-dark.css?raw'),
  'paraiso-light': () => import('highlight.js/styles/paraiso-light.css?raw'),
  'rose-pine': () => import('highlight.js/styles/rose-pine.css?raw'),
  'rose-pine-dawn': () => import('highlight.js/styles/rose-pine-dawn.css?raw'),
  'tokyo-night-dark': () => import('highlight.js/styles/tokyo-night-dark.css?raw'),
  'tokyo-night-light': () => import('highlight.js/styles/tokyo-night-light.css?raw'),
}

export async function loadCodeThemeCss(id: string): Promise<string | undefined> {
  if (cache.has(id)) {
    return cache.get(id)
  }

  const loader = themeModules[id]
  if (!loader) {
    return undefined
  }

  const mod = await loader()
  cache.set(id, mod.default)

  return mod.default
}
