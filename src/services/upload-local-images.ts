import { apiFetch } from '@/lib/api'

export interface GithubImageUploadRequest {
  url: string
}

export interface GithubImageUploadResult {
  originalUrl: string
  cdnUrl: string
}

export interface GithubImageUploadResponse {
  results: GithubImageUploadResult[]
}

export async function uploadLocalImages(
  images: GithubImageUploadRequest[],
): Promise<GithubImageUploadResult[]> {
  try {
    const response = await apiFetch<GithubImageUploadResponse>('/api/upload/github-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    })
    return response.results
  }
  catch (error: any) {
    const message = error?.data?.error || error?.message || '图片上传到 GitHub 失败'
    throw new Error(message)
  }
}
