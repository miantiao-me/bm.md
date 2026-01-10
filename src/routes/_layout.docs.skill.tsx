import type { PageMeta } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'

import { CopyButton } from '@/components/copy-button'
import PageDialog from '@/components/dialog/page'
import markdown from '@/content/skill.md?raw'
import { createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/_layout/docs/skill')({
  loader: () => {
    const meta: PageMeta = {
      title: '技能',
      description: '让 AI 助手掌握 bm.md 的 Markdown 排版技能',
    }
    return { markdown, meta }
  },
  head: ({ loaderData, match }) => loaderData
    ? createPageHead({ pathname: match.pathname, meta: loaderData.meta })
    : {},
  component: SkillModal,
})

function SkillModal() {
  const { markdown, meta } = Route.useLoaderData()
  return (
    <PageDialog
      title={meta.title}
      description={meta.description}
      actions={<CopyButton text={markdown} />}
      render={(
        <div className="relative rounded-md bg-muted">
          <pre className="overflow-x-auto p-3 text-xs">
            <code>{markdown}</code>
          </pre>
        </div>
      )}
    />
  )
}
