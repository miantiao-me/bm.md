import process from 'node:process'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { corsMiddleware } from '@/lib/middleware/cors'
import { GitHubStorage, StorageError } from '@/storage'

const imageSchema = z.object({
  url: z.string().min(1),
})

const requestSchema = z.object({
  images: z.array(imageSchema).min(1).max(50),
})

export const Route = createFileRoute('/api/upload/github-images')({
  server: {
    middleware: [corsMiddleware],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as unknown
          const parsed = requestSchema.parse(body)

          const storage = new GitHubStorage()
          const results: Array<{ originalUrl: string, cdnUrl: string }> = []

          for (const { url } of parsed.images) {
            try {
              const filename = url.split('/').at(-1) || 'image.png'
              const decodedUrl = decodeURIComponent(url)

              let filePath: string
              const hasScheme = /^[a-z][a-z0-9+\-.]*:\/\//i.test(decodedUrl)

              if (hasScheme) {
                if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(decodedUrl)) {
                  const urlObj = new URL(decodedUrl)
                  filePath = `.${urlObj.pathname}`
                }
                else {
                  results.push({ originalUrl: url, cdnUrl: '' })
                  continue
                }
              }
              else if (decodedUrl.startsWith('/')) {
                filePath = `.${decodedUrl}`
              }
              else if (/^[a-z]:\\/i.test(decodedUrl) || /^[a-z]:\//i.test(decodedUrl)) {
                filePath = decodedUrl
              }
              else {
                filePath = `./public/${decodedUrl}`
              }

              const fs = await import('node:fs')
              const path = await import('node:path')
              const absolutePath = path.resolve(process.cwd(), filePath)

              if (!fs.existsSync(absolutePath)) {
                results.push({ originalUrl: url, cdnUrl: '' })
                continue
              }

              const fileBuffer = fs.readFileSync(absolutePath)

              const uploadResult = await storage.upload({
                file: fileBuffer,
                filename,
                contentType: 'image/png',
              })

              results.push({ originalUrl: url, cdnUrl: uploadResult.url })
            }
            catch {
              results.push({ originalUrl: url, cdnUrl: '' })
            }
          }

          return Response.json({ results })
        }
        catch (error) {
          if (error instanceof StorageError) {
            console.error(`GitHub upload error [${error.provider}]:`, error.message, error.cause)
            return Response.json(
              { error: 'GitHub 图床上传失败' },
              { status: 500 },
            )
          }

          console.error('GitHub upload error:', error)

          if (error && typeof error === 'object' && 'issues' in error) {
            return Response.json(
              { error: '请求参数错误' },
              { status: 400 },
            )
          }

          return Response.json(
            { error: '图片上传失败，请稍后重试' },
            { status: 500 },
          )
        }
      },
    },
  },
})
