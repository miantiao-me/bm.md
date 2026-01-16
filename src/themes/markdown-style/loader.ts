const cache = new Map<string, string>()

let resetCssPromise: Promise<string> | null = null

function loadResetCss(): Promise<string> {
  return resetCssPromise ??= import('./reset.css?raw').then(m => m.default)
}

const themeModules: Record<string, () => Promise<{ default: string }>> = {
  'ayu-light': () => import('./ayu-light.css?raw'),
  'bauhaus': () => import('./bauhaus.css?raw'),
  'blueprint': () => import('./blueprint.css?raw'),
  'botanical': () => import('./botanical.css?raw'),
  'green-simple': () => import('./green-simple.css?raw'),
  'maximalism': () => import('./maximalism.css?raw'),
  'neo-brutalism': () => import('./neo-brutalism.css?raw'),
  'newsprint': () => import('./newsprint.css?raw'),
  'organic': () => import('./organic.css?raw'),
  'playful-geometric': () => import('./playful-geometric.css?raw'),
  'professional': () => import('./professional.css?raw'),
  'retro': () => import('./retro.css?raw'),
  'sketch': () => import('./sketch.css?raw'),
  'terminal': () => import('./terminal.css?raw'),
}

export async function loadMarkdownStyleCss(id: string): Promise<string | undefined> {
  if (cache.has(id)) {
    return cache.get(id)
  }

  const loader = themeModules[id]
  if (!loader) {
    return undefined
  }

  const [resetCss, themeMod] = await Promise.all([
    loadResetCss(),
    loader(),
  ])

  const css = resetCss + themeMod.default
  cache.set(id, css)

  return css
}
