import { uploadImage } from './upload-image'

export async function prepareImageImport(file: File, ocr: boolean, enhanced: boolean) {
  if (ocr) {
    const { recognizeImageText } = await import('./ocr')
    const content = await recognizeImageText(file, enhanced)
    return { kind: 'text' as const, content }
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', file.name)
  const { url } = await uploadImage(formData)
  return { kind: 'image' as const, content: `![${file.name}](${url})\n\n` }
}
