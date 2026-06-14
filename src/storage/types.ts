/**
 * 存储服务类型定义
 */
import type { Buffer } from 'node:buffer'

/** 存储提供商类型 */
export type StorageProviderType = 's3' | 'dc' | 'github'

/** 上传结果 */
export interface UploadResult {
  url: string
}

/** 上传选项 */
export interface UploadOptions {
  /** 文件内容 (Blob 用于浏览器端, Buffer 用于服务端) */
  file: Blob | Buffer
  /** 文件名 */
  filename: string
  /** 文件 MIME 类型 */
  contentType: string
}

/** 存储提供商接口 */
export interface StorageProvider {
  /** 提供商类型 */
  readonly type: StorageProviderType
  /** 上传文件 */
  upload: (options: UploadOptions) => Promise<UploadResult>
}

/** 存储错误类，包含 provider 标识 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly provider: StorageProviderType,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'StorageError'
  }
}
