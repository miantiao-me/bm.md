import type { LocalImageRef } from '@/lib/actions/check-local-images'
import { create } from 'zustand'

interface ImageUploadState {
  images: LocalImageRef[]
  isOpen: boolean
  isUploading: boolean
  showDialog: (images: LocalImageRef[]) => Promise<boolean>
  confirmUpload: () => void
  cancelUpload: () => void
}

export const useImageUploadStore = create<ImageUploadState>(() => {
  let resolveRef: ((value: boolean) => void) | null = null

  return {
    images: [],
    isOpen: false,
    isUploading: false,

    showDialog: async (images: LocalImageRef[]) => {
      useImageUploadStore.setState({ images, isOpen: true, isUploading: false })
      return new Promise<boolean>((resolve) => {
        resolveRef = resolve
      })
    },

    confirmUpload: () => {
      useImageUploadStore.setState({ isOpen: false })
      resolveRef?.(true)
      resolveRef = null
    },

    cancelUpload: () => {
      useImageUploadStore.setState({ isOpen: false })
      resolveRef?.(false)
      resolveRef = null
    },
  }
})
