import { beforeEach, describe, expect, it, vi } from 'vitest'

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('editor store 持久化', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it.each([
    ['无存储记录', undefined],
    ['空 state', null],
    ['字符串 state', 'invalid'],
    ['数字 state', 42],
    ['布尔 state', false],
    ['错误字段类型', {
      enableFootnoteLinks: 'false',
      breaks: 1,
      openLinksInNewWindow: null,
      enableScrollSync: {},
      enableImageOcr: 'true',
      enableEnhancedImageOcr: 1,
      scrollRatio: 0.75,
      scrollSource: 'preview',
    }],
  ])('%s 时完成恢复并保留默认值', async (_, state) => {
    const localStorage = createMemoryStorage(state === undefined
      ? {}
      : { 'bm.md.editor': JSON.stringify({ state, version: 0 }) })
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('window', { localStorage })

    const { useEditorStore } = await import('./editor')
    expect(useEditorStore.persist.hasHydrated()).toBe(false)
    await useEditorStore.persist.rehydrate()

    expect(useEditorStore.persist.hasHydrated()).toBe(true)
    expect(useEditorStore.getState()).toMatchObject({
      scrollRatio: 0,
      scrollSource: null,
      enableFootnoteLinks: true,
      breaks: false,
      openLinksInNewWindow: true,
      enableScrollSync: true,
      enableImageOcr: false,
      enableEnhancedImageOcr: false,
    })
  })

  it('显式恢复时只恢复设置字段并忽略旧滚动状态', async () => {
    const localStorage = createMemoryStorage({
      'bm.md.editor': JSON.stringify({
        state: {
          scrollRatio: 0.75,
          scrollSource: 'preview',
          enableFootnoteLinks: false,
          openLinksInNewWindow: false,
          enableScrollSync: false,
          enableImageOcr: true,
          enableEnhancedImageOcr: true,
        },
        version: 0,
      }),
    })
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('window', { localStorage })

    const { useEditorStore } = await import('./editor')
    await useEditorStore.persist.rehydrate()

    expect(useEditorStore.getState()).toMatchObject({
      scrollRatio: 0,
      scrollSource: null,
      enableFootnoteLinks: false,
      breaks: false,
      openLinksInNewWindow: false,
      enableScrollSync: false,
      enableImageOcr: true,
      enableEnhancedImageOcr: true,
    })
  })

  it('恢复已持久化的 breaks 设置', async () => {
    const localStorage = createMemoryStorage({
      'bm.md.editor': JSON.stringify({
        state: { breaks: true },
        version: 0,
      }),
    })
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('window', { localStorage })

    const { useEditorStore } = await import('./editor')
    await useEditorStore.persist.rehydrate()

    expect(useEditorStore.getState().breaks).toBe(true)
  })
})
