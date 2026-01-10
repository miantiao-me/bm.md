import { apiFetch } from '@/lib/api'

export interface UploadImageResponse {
  url: string
}

export async function uploadImage(formData: FormData): Promise<UploadImageResponse> {
  try {
    return await apiFetch<UploadImageResponse>('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
  }
  catch (error: any) {
    const message = error?.data?.error || error?.message
    throw new Error(message || '图片上传失败')
  }
}
