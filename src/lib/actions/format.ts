import { toast } from 'sonner'

export async function formatMarkdown(
  content: string,
  setContent: (content: string) => void,
) {
  try {
    const { markdown } = await import('@/lib/markdown/browser')
    const { result: formatted } = await markdown.lint({ markdown: content })
    setContent(formatted)
    toast.success('格式化成功')
  }
  catch (error) {
    toast.error('格式化失败')
    console.error(error)
  }
}
