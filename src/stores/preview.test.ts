import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKDOWN_STYLE_ID } from '@/themes/markdown-style/metadata'
import {
  migratePreviewState,
  partializePreviewState,
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from './preview'

describe('preview store 持久化', () => {
  it('默认使用 Kami 主题', () => {
    expect(usePreviewStore.getState().markdownStyle).toBe(DEFAULT_MARKDOWN_STYLE_ID)
  })

  it('持久化 previewWidth', () => {
    const persisted = partializePreviewState({
      ...usePreviewStore.getState(),
      previewWidth: PREVIEW_WIDTH_DESKTOP,
    })

    expect(persisted.previewWidth).toBe(PREVIEW_WIDTH_DESKTOP)
    expect(persisted).not.toHaveProperty('userPreferredWidth')
  })

  it.each([PREVIEW_WIDTH_MOBILE, PREVIEW_WIDTH_DESKTOP])(
    '迁移旧 userPreferredWidth %i',
    (userPreferredWidth) => {
      expect(migratePreviewState({ userPreferredWidth })).toEqual({
        previewWidth: userPreferredWidth,
      })
    },
  )

  it.each([undefined, null, 0, 500, '768'])(
    '非法旧宽度 %s 回退为手机宽度并保留其他设置',
    (userPreferredWidth) => {
      expect(migratePreviewState({
        userPreferredWidth,
        previewColorScheme: 'dark',
        markdownStyle: 'custom',
      })).toEqual({
        previewWidth: PREVIEW_WIDTH_MOBILE,
        previewColorScheme: 'dark',
        markdownStyle: 'custom',
      })
    },
  )
})
