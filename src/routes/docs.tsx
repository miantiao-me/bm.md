import type { PageMeta } from '@/lib/seo'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

import { scalarConfig } from '@/config'
import { createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/docs')({
  loader: () => {
    const meta: PageMeta = {
      title: 'API 文档',
    }
    return { meta }
  },
  head: ({ loaderData, match }) => loaderData
    ? createPageHead({ pathname: match.pathname, meta: loaderData.meta })
    : {},
  component: ApiReferencePage,
})

function ApiReferencePage() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
    script.onload = () => {
      window.Scalar.createApiReference('#scalar-api-reference', {
        url: scalarConfig.url,
        theme: scalarConfig.theme,
        customCss: scalarConfig.customCss,
      })
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return <div id="scalar-api-reference" className="min-h-screen" />
}
