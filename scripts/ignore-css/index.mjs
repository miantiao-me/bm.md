// ignore-css.mjs
export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css') || specifier.includes('.css?')) {
    // 返回一个虚拟的 data URL 来表示 CSS 模块
    return {
      url: `data:text/javascript,export default {};`,
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('data:text/javascript,export default {};')) {
    return {
      format: 'module',
      source: 'export default {}',
      shortCircuit: true,
    }
  }
  return nextLoad(url, context)
}
