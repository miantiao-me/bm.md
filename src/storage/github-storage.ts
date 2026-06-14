'use server'

import type { StorageProvider, UploadOptions, UploadResult } from './types'
import { Buffer } from 'node:buffer'

import { request as httpsRequest } from 'node:https'
import { env } from '@/env'
import { StorageError } from './types'

function httpsFetch(url: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: string
}): Promise<{ status: number, text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const mod = httpsRequest

    const req = mod(urlObj, {
      method: options.method || 'GET',
      headers: options.headers,
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        resolve({
          status: res.statusCode || 0,
          text: async () => body.toString('utf-8'),
        })
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

export class GitHubStorage implements StorageProvider {
  readonly type = 'github' as const

  private token: string
  private owner: string
  private repo: string
  private branch: string

  constructor() {
    const token = env.GITHUB_TOKEN
    const owner = env.GITHUB_OWNER
    const repo = env.GITHUB_REPO

    console.info(`[GitHubStorage] token loaded: ${!!token}, len: ${token?.length ?? 0}, owner: ${owner}, repo: ${repo}, branch: ${env.GITHUB_BRANCH || 'main'}`)

    if (!token || !owner || !repo) {
      throw new StorageError('GitHub 凭证配置缺失（需要 GITHUB_TOKEN、GITHUB_OWNER、GITHUB_REPO）', 'github')
    }

    this.token = token
    this.owner = owner
    this.repo = repo
    this.branch = env.GITHUB_BRANCH || 'main'
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { file, filename } = options

    try {
      const buffer = Buffer.isBuffer(file) ? file : Buffer.from(new Uint8Array(await file.arrayBuffer()))
      const content = buffer.toString('base64')

      const timestamp = Date.now()
      const safeName = filename.replace(/[^\w.-]/g, '_')
      const path = `articles/${timestamp}-${safeName}`
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`

      console.info(`[GitHubStorage] uploading: ${path}, size: ${buffer.length} bytes`)

      const response = await httpsFetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'bm.md',
        },
        body: JSON.stringify({
          message: `Upload image via bm.md: ${safeName}`,
          content,
          branch: this.branch,
        }),
      })

      if (response.status < 200 || response.status >= 300) {
        const errorText = await response.text()
        console.error('[GitHubStorage] upload failed:', response.status, errorText)
        console.error('[GitHubStorage] request URL:', url)
        console.error('[GitHubStorage] token prefix:', `${this.token.slice(0, 12)}...`)
        throw new StorageError(`上传失败: ${response.status}`, 'github')
      }

      const cdnUrl = `https://cdn.jsdelivr.net/gh/${this.owner}/${this.repo}@${this.branch}/${path}`
      return { url: cdnUrl }
    }
    catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError('上传过程发生错误', 'github', error)
    }
  }
}
