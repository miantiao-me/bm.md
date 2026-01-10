import { appConfig } from '@/config'

export interface PageMeta {
  title: string
  description?: string
}

interface CreatePageHeadOptions {
  pathname: string
  meta: PageMeta
}

export function createPageHead({ pathname, meta }: CreatePageHeadOptions) {
  const { title, description = appConfig.description } = meta
  const fullTitle = `${title} | ${appConfig.name}`
  const canonicalUrl = `${appConfig.url}${pathname}`

  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
    ],
    links: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  }
}
