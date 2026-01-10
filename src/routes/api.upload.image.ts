import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import { corsMiddleware } from '@/lib/middleware/cors'
import { getStorageProvider, StorageError } from '@/storage'

const _1MB = 1024 * 1024 // 1MB
const maxFileSize = 5

const uploadSchema = z.object({
  name: z.string().min(1),
  file: z.instanceof(Blob),
})

export const Route = createFileRoute('/api/upload/image')({
  server: {
    middleware: [corsMiddleware],
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. 解析 FormData
          const formData = await request.formData()
          const file = formData.get('file')
          const name = formData.get('name')

          // 2. 校验输入
          const parsed = uploadSchema.parse({ file, name })
          const { file: imageFile, name: imageName } = parsed

          // 3. 校验文件类型和大小
          if (!imageFile.type.startsWith('image/')) {
            return Response.json(
              { error: '只支持上传图片文件' },
              { status: 400 },
            )
          }

          if (imageFile.size > maxFileSize * _1MB) {
            return Response.json(
              { error: `图片大小不能超过 ${maxFileSize}MB` },
              { status: 400 },
            )
          }

          // 4. 获取存储提供商并上传
          const storage = getStorageProvider()
          const result = await storage.upload({
            file: imageFile,
            filename: imageName,
            contentType: imageFile.type,
          })

          // 5. 返回成功响应
          return Response.json({ url: result.url })
        }
        catch (error) {
          // 处理存储错误（包含 provider 标识）
          if (error instanceof StorageError) {
            console.error(`Upload error [${error.provider}]:`, error.message, error.cause)
            return Response.json(
              { error: '图片上传到存储失败' },
              { status: 500 },
            )
          }

          console.error('Upload error:', error)

          // 处理 Zod 验证错误
          if (error && typeof error === 'object' && 'issues' in error) {
            return Response.json(
              { error: '请求参数错误' },
              { status: 400 },
            )
          }

          // 其他错误
          return Response.json(
            { error: '图片上传失败，请稍后重试' },
            { status: 500 },
          )
        }
      },
    },
  },
})
