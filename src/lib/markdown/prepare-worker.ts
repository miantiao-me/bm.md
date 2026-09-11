export async function prepareMarkdownWorker() {
  const { worker } = await import('@/lib/markdown/browser')
  return worker.prepare()
}
