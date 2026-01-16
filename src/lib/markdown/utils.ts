let katexCssCache: string | null = null

export async function loadKatexCss() {
  if (katexCssCache) {
    return katexCssCache
  }

  const { default: katexCss } = await import('katex/dist/katex.css?raw')
  katexCssCache = katexCss
  return katexCss
}
