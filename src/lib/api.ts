import { $fetch } from 'ofetch'
import { env } from '@/env'

export function getApiBaseUrl(): string {
  return env.VITE_API_URL?.replace(/\/$/, '') || ''
}

export function isCrossOriginApi(): boolean {
  return !!env.VITE_API_URL
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const baseURL = getApiBaseUrl()
  const url = baseURL ? `${baseURL}${path}` : path

  return $fetch<T>(url, {
    ...options,
    credentials: isCrossOriginApi() ? 'include' : 'same-origin',
  })
}
