/**
 * DC 图床存储实现
 * 默认使用 https://dc.missuo.ru/upload
 */

import type { StorageProvider, UploadOptions, UploadResult } from './types'
import { env } from '@/env'
import { StorageError } from './types'

/** DC 上传响应格式 */
interface DCUploadResponse {
  url: string
}

export class DCStorage implements StorageProvider {
  readonly type = 'dc' as const

  private uploadUrl: string

  constructor() {
    this.uploadUrl = env.DC_UPLOAD_URL || 'https://dc.missuo.ru/upload'
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { file, filename } = options

    try {
      // 构造 FormData，DC 使用 "image" 作为字段名
      const formData = new FormData()
      formData.append('image', file, filename)

      const response = await fetch(this.uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DC upload failed:', response.status, errorText)
        throw new StorageError(`上传失败: ${response.status}`, 'dc')
      }

      const data = await response.json() as DCUploadResponse

      if (!data.url) {
        throw new StorageError('响应中缺少 url 字段', 'dc')
      }

      return { url: data.url }
    }
    catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError('上传过程发生错误', 'dc', error)
    }
  }
}
