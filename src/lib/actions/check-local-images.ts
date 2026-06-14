export interface LocalImageRef {
  fullMatch: string
  url: string
  filename: string
  alt?: string
}

const LOCAL_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g

function isLocalUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed || trimmed.startsWith('#'))
    return false

  // 有显式协议头
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) {
    // 仅 localhost / 127.0.0.1 算本地
    return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(trimmed)
  }

  // data: 或类似协议无前导 // → 非本地
  if (/^data:/i.test(trimmed))
    return false

  // 无协议头 → 相对路径或绝对服务器路径，均视为本地
  return true
}

function extractFilename(url: string): string {
  const clean = url.replace(/[?#].*$/, '').replace(/\/$/, '')
  const segments = clean.split(/[/\\]/)
  const last = segments.at(-1)
  if (last && last.includes('.')) {
    return decodeURIComponent(last)
  }
  return 'image.png'
}

export function findLocalImagesInMarkdown(markdown: string): LocalImageRef[] {
  const results: LocalImageRef[] = []

  LOCAL_IMAGE_RE.lastIndex = 0

  for (let match = LOCAL_IMAGE_RE.exec(markdown); match; match = LOCAL_IMAGE_RE.exec(markdown)) {
    const alt = match[1]
    const url = match[2].trim()

    if (isLocalUrl(url)) {
      results.push({
        fullMatch: match[0],
        url,
        filename: extractFilename(url),
        alt: alt || undefined,
      })
    }
  }

  return results
}

export function replaceImageUrlsInMarkdown(
  markdown: string,
  replacements: Map<string, string>,
): string {
  let result = markdown

  for (const [originalUrl, cdnUrl] of replacements) {
    const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?<=\\()${escapedUrl}(?=\\s*["')])`, 'g')
    result = result.replace(regex, cdnUrl)
  }

  return result
}
