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

  it('显式恢复时只恢复四个设置字段并忽略旧滚动状态', async () => {
    const localStorage = createMemoryStorage({
      'bm.md.editor': JSON.stringify({
        state: {
          scrollRatio: 0.75,
          scrollSource: 'preview',
          enableFootnoteLinks: false,
          openLinksInNewWindow: false,
          enableScrollSync: false,
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
