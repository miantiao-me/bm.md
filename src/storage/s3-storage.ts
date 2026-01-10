/**
 * S3 兼容存储实现
 */

import type { StorageProvider, UploadOptions, UploadResult } from './types'
import { AwsClient } from 'aws4fetch'

import { env } from '@/env'
import { StorageError } from './types'

export class S3Storage implements StorageProvider {
  readonly type = 's3' as const

  private aws: AwsClient

  constructor() {
    const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = env

    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new StorageError('S3 凭证配置缺失', 's3')
    }

    this.aws = new AwsClient({
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      region: S3_REGION || 'auto',
      service: 's3',
    })
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { file, filename, contentType } = options
    const { S3_ENDPOINT, S3_BUCKET, S3_PUBLIC_BASE_URL } = env

    if (!S3_ENDPOINT) {
      throw new StorageError('S3_ENDPOINT 配置缺失', 's3')
    }

    try {
      // 生成唯一的文件名
      const ext = filename.split('.').at(-1) || 'png'
      const key = `${new Date().toISOString().split('T')[0]}/${crypto.randomUUID()}.${ext}`

      // 上传到 S3
      const arrayBuffer = await file.arrayBuffer()

      // 构造 S3 URL
      const s3Url = [S3_ENDPOINT, S3_BUCKET, key].filter(Boolean).join('/')

      const uploadRes = await this.aws.fetch(s3Url, {
        method: 'PUT',
        body: arrayBuffer,
        headers: {
          'Content-Type': contentType,
        },
      })

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error('S3 upload failed:', uploadRes.status, errorText)
        throw new StorageError(`上传失败: ${uploadRes.status}`, 's3')
      }

      // 构造返回的 URL
      let url: string
      if (S3_PUBLIC_BASE_URL) {
        // 确保 base url 结尾没有 /，且 key 开头没有 /
        const baseUrl = S3_PUBLIC_BASE_URL.replace(/\/$/, '')
        const safeKey = key.replace(/^\//, '')
        url = `${baseUrl}/${safeKey}`
      }
      else {
        // 如果没有配置 public base url，尝试直接用 endpoint 拼接
        url = `${S3_ENDPOINT}/${key}`
      }

      return { url }
    }
    catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError('上传过程发生错误', 's3', error)
    }
  }
}
