import type { FileCatalog, FileContentSnapshot, MarkdownFile } from '@/lib/file-storage'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  FileStorageError: class FileStorageError extends Error {
    constructor() {
      super('浏览器持久化操作失败，请重试或导出内容')
      this.name = 'FileStorageError'
    }
  },
  createFileRecord: vi.fn(),
  deleteFileRecord: vi.fn(),
  getFileCatalog: vi.fn(),
  getFileSnapshot: vi.fn(),
  getStorageUnavailableReason: vi.fn(() => '存储不可用'),
  initializeFileStorage: vi.fn(),
  isFileStorageError: vi.fn(() => false),
  isStorageUnavailable: vi.fn(() => false),
  renameFileRecord: vi.fn(),
  saveFileContent: vi.fn(),
  publishCatalogSignal: vi.fn(),
  publishContentSignal: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/lib/file-storage', () => ({
  FileStorageError: mocks.FileStorageError,
  createFileRecord: mocks.createFileRecord,
  deleteFileRecord: mocks.deleteFileRecord,
  getFileCatalog: mocks.getFileCatalog,
  getFileSnapshot: mocks.getFileSnapshot,
  getStorageUnavailableReason: mocks.getStorageUnavailableReason,
  initializeFileStorage: mocks.initializeFileStorage,
  isFileStorageError: mocks.isFileStorageError,
  isStorageUnavailable: mocks.isStorageUnavailable,
  renameFileRecord: mocks.renameFileRecord,
  saveFileContent: mocks.saveFileContent,
}))

vi.mock('@/lib/files-sync', () => ({
  publishCatalogSignal: mocks.publishCatalogSignal,
  publishContentSignal: mocks.publishContentSignal,
}))
vi.mock('sonner', () => ({ toast: { warning: mocks.warning, error: mocks.error } }))

interface StoreModule {
  isFileContentReady: typeof import('./files')['isFileContentReady']
  useFilesStore: typeof import('./files')['useFilesStore']
}

function file(id: string, name = `${id}.md`): MarkdownFile {
  return { id, name, createdAt: 1, updatedAt: 1 }
}

function catalog(revision: number, files: MarkdownFile[]): FileCatalog {
  return { revision, files }
}

function snapshot(content: string, version = 1): FileContentSnapshot {
  return { content, version }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, reject, resolve }
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

let storeModule: StoreModule

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
  mocks.isStorageUnavailable.mockReturnValue(false)
  mocks.isFileStorageError.mockReturnValue(false)
  mocks.saveFileContent.mockResolvedValue(2)
  mocks.getFileSnapshot.mockResolvedValue(snapshot('正文'))
  const initialCatalog = catalog(1, [file('one')])
  mocks.initializeFileStorage.mockResolvedValue(initialCatalog)
  mocks.getFileCatalog.mockResolvedValue(initialCatalog)
  storeModule = await import('./files')
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

function ready(files = [file('one')], active = 'one', revision = 1) {
  storeModule.useFilesStore.setState({
    files,
    activeFileId: active,
    contentFileId: active,
    currentContent: '旧正文',
    contentStatus: 'ready',
    contentVersion: 1,
    contentEpoch: 1,
    revision,
    isInitialized: true,
  })
}

describe('files store', () => {
  it('同文件保存串行且其他文件不等待其提交', async () => {
    const first = deferred<number>()
    mocks.saveFileContent.mockImplementation((id: string, content: string) => {
      return id === 'one' && content === '第一笔' ? first.promise : Promise.resolve(3)
    })
    ready([file('one'), file('two')])
    const store = storeModule.useFilesStore
    store.getState().setCurrentContent('第一笔')
    store.getState().setCurrentContent('最新正文')
    expect(mocks.saveFileContent).toHaveBeenCalledTimes(1)

    ready([file('one'), file('two')], 'two')
    store.getState().setCurrentContent('另一文件')
    expect(mocks.saveFileContent.mock.calls).toEqual([
      ['one', '第一笔'],
      ['two', '另一文件'],
    ])

    const flushing = store.getState().flushPendingSaves()
    first.resolve(2)
    await expect(flushing).resolves.toBe(true)
    expect(mocks.saveFileContent.mock.calls).toEqual([
      ['one', '第一笔'],
      ['two', '另一文件'],
      ['one', '最新正文'],
    ])
    expect(store.getState().contentVersion).toBe(3)
  })

  it('ready 要求存在非空 activeFileId', () => {
    expect(storeModule.isFileContentReady({ activeFileId: null, contentFileId: null, contentStatus: 'ready' })).toBe(false)
    expect(storeModule.isFileContentReady({ activeFileId: 'one', contentFileId: 'one', contentStatus: 'ready' })).toBe(true)
  })

  it('sessionStorage getter 抛出 SecurityError 时模块仍可加载', async () => {
    vi.resetModules()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('禁止访问', 'SecurityError')
      },
    })

    await expect(import('./files')).resolves.toBeDefined()
  })

  it('迁移时 session active 优先并原子加载 snapshot', async () => {
    const files = [file('legacy'), file('session')]
    localStorage.setItem('bm.md.files', JSON.stringify({ state: { files, activeFileId: 'legacy' } }))
    sessionStorage.setItem('bm.md.files.active', 'session')
    mocks.initializeFileStorage.mockResolvedValue(catalog(3, files))
    mocks.getFileSnapshot.mockResolvedValue(snapshot('会话正文', 4))

    await storeModule.useFilesStore.getState().initialize()

    expect(storeModule.useFilesStore.getState()).toMatchObject({
      isInitialized: true,
      activeFileId: 'session',
      contentFileId: 'session',
      currentContent: '会话正文',
      contentVersion: 4,
      contentEpoch: 1,
      contentStatus: 'ready',
      revision: 3,
    })
    expect(localStorage.getItem('bm.md.files')).toBeNull()
  })

  it('initialize 期间的 early sync 等待初始化且最终 initialized', async () => {
    const opening = deferred<FileCatalog>()
    mocks.initializeFileStorage.mockReturnValue(opening.promise)
    const initializing = storeModule.useFilesStore.getState().initialize()
    const syncing = storeModule.useFilesStore.getState().syncExternalChanges()
    opening.resolve(catalog(1, [file('one')]))
    await Promise.all([initializing, syncing])
    expect(storeModule.useFilesStore.getState()).toMatchObject({ isInitialized: true, activeFileId: 'one', contentStatus: 'ready' })
    expect(mocks.initializeFileStorage).toHaveBeenCalledOnce()
    expect(mocks.getFileCatalog).toHaveBeenCalledOnce()
  })

  it('initialize 失败后保持未初始化并允许重试成功', async () => {
    mocks.initializeFileStorage
      .mockRejectedValueOnce(new mocks.FileStorageError())
      .mockResolvedValueOnce(catalog(1, [file('one')]))

    await expect(storeModule.useFilesStore.getState().initialize()).rejects.toBeInstanceOf(mocks.FileStorageError)
    expect(storeModule.useFilesStore.getState().isInitialized).toBe(false)

    await expect(storeModule.useFilesStore.getState().initialize()).resolves.toBeUndefined()
    expect(mocks.initializeFileStorage).toHaveBeenCalledTimes(2)
    expect(storeModule.useFilesStore.getState()).toMatchObject({ isInitialized: true, activeFileId: 'one', contentStatus: 'ready' })
  })

  it('initialize 的 active reconcile 失败后可重试', async () => {
    mocks.getFileSnapshot
      .mockRejectedValueOnce(new mocks.FileStorageError())
      .mockResolvedValueOnce(snapshot('重试正文', 5))

    await expect(storeModule.useFilesStore.getState().initialize()).rejects.toBeInstanceOf(mocks.FileStorageError)
    expect(storeModule.useFilesStore.getState()).toMatchObject({ isInitialized: false, activeFileId: 'one', contentFileId: null, contentStatus: 'idle' })

    await storeModule.useFilesStore.getState().initialize()
    expect(storeModule.useFilesStore.getState()).toMatchObject({ isInitialized: true, activeFileId: 'one', contentFileId: 'one', currentContent: '重试正文', contentStatus: 'ready' })
  })

  it('删除活动文件与被动同步交错后按实时 catalog fallback', async () => {
    ready([file('one'), file('two')])
    const deleting = deferred<{ catalog: FileCatalog, nextFileId: string | null }>()
    mocks.deleteFileRecord.mockReturnValue(deleting.promise)
    mocks.getFileCatalog.mockResolvedValue(catalog(1, [file('one'), file('two')]))
    mocks.getFileSnapshot.mockImplementation(id => Promise.resolve(snapshot(id === 'two' ? '第二篇' : '远端旧正文')))
    const deletion = storeModule.useFilesStore.getState().deleteFile('one')
    await storeModule.useFilesStore.getState().syncExternalChanges()
    deleting.resolve({ catalog: catalog(2, [file('two')]), nextFileId: 'two' })
    await deletion
    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'two', contentFileId: 'two', currentContent: '第二篇', contentStatus: 'ready' })
  })

  it.each(['delete-first', 'switch-first'])('删除非活动目标与切换交错：%s', async (order) => {
    ready([file('one'), file('two')])
    const targetLoad = deferred<FileContentSnapshot>()
    const deleting = deferred<{ catalog: FileCatalog, nextFileId: string | null }>()
    mocks.getFileSnapshot.mockImplementation(id => id === 'two' ? targetLoad.promise : Promise.resolve(snapshot('第一篇')))
    mocks.deleteFileRecord.mockReturnValue(deleting.promise)
    const switching = storeModule.useFilesStore.getState().switchFile('two')
    const deletion = storeModule.useFilesStore.getState().deleteFile('two')
    if (order === 'delete-first') {
      deleting.resolve({ catalog: catalog(2, [file('one')]), nextFileId: 'one' })
      await deletion
      targetLoad.resolve(snapshot('已删除正文'))
    }
    else {
      targetLoad.resolve(snapshot('第二篇'))
      await switching
      deleting.resolve({ catalog: catalog(2, [file('one')]), nextFileId: 'one' })
      await deletion
    }
    await switching
    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'one', contentFileId: 'one', currentContent: '第一篇', contentStatus: 'ready' })
  })

  it('create 与 no-op sync 交错仍保持最后用户激活', async () => {
    ready()
    const creating = deferred<{ catalog: FileCatalog, file: MarkdownFile }>()
    mocks.createFileRecord.mockReturnValue(creating.promise)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    const created = file('00000000-0000-4000-8000-000000000001')
    const creation = storeModule.useFilesStore.getState().createFile('新文件', '新正文')
    await storeModule.useFilesStore.getState().syncExternalChanges()
    creating.resolve({ catalog: catalog(2, [file('one'), created]), file: created })
    await creation
    expect(storeModule.useFilesStore.getState()).toMatchObject({
      activeFileId: created.id,
      contentFileId: created.id,
      currentContent: '新正文',
      contentVersion: 1,
      contentEpoch: 2,
    })
  })

  it.each(['create-first', 'switch-first'])('create 与后发 switch 完成顺序为 %s 时仍由 switch 获胜', async (order) => {
    ready([file('one'), file('two')])
    const creating = deferred<{ catalog: FileCatalog, file: MarkdownFile }>()
    const loading = deferred<FileContentSnapshot>()
    const created = file('00000000-0000-4000-8000-000000000002')
    mocks.createFileRecord.mockReturnValue(creating.promise)
    mocks.getFileSnapshot.mockReturnValue(loading.promise)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000002')

    const creation = storeModule.useFilesStore.getState().createFile('新文件', '新正文')
    await vi.waitFor(() => expect(mocks.createFileRecord).toHaveBeenCalledOnce())
    const switching = storeModule.useFilesStore.getState().switchFile('two')

    if (order === 'create-first') {
      creating.resolve({ catalog: catalog(2, [file('one'), file('two'), created]), file: created })
      await creation
      loading.resolve(snapshot('第二篇', 3))
    }
    else {
      loading.resolve(snapshot('第二篇', 3))
      await switching
      creating.resolve({ catalog: catalog(2, [file('one'), file('two'), created]), file: created })
    }
    await Promise.all([creation, switching])

    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'two', contentFileId: 'two', currentContent: '第二篇', contentStatus: 'ready' })
  })

  it('create 在 active loading 期间失败时恢复被作废的 active 加载', async () => {
    ready([file('one'), file('two')])
    const staleLoad = deferred<FileContentSnapshot>()
    mocks.getFileSnapshot.mockReturnValueOnce(staleLoad.promise).mockResolvedValueOnce(snapshot('第二篇', 4))
    const switching = storeModule.useFilesStore.getState().switchFile('two')
    await vi.waitFor(() => expect(storeModule.useFilesStore.getState().contentStatus).toBe('loading'))
    mocks.createFileRecord.mockRejectedValue(new mocks.FileStorageError())

    await expect(storeModule.useFilesStore.getState().createFile('失败')).rejects.toBeInstanceOf(mocks.FileStorageError)

    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'two', contentFileId: 'two', currentContent: '第二篇', contentStatus: 'ready' })
    staleLoad.resolve(snapshot('过期正文'))
    await switching
    expect(storeModule.useFilesStore.getState().currentContent).toBe('第二篇')
  })

  it('activate 目标被远端删除后不会停留 loading', async () => {
    ready([file('one'), file('two')])
    const staleLoad = deferred<FileContentSnapshot>()
    mocks.getFileSnapshot.mockReturnValueOnce(staleLoad.promise).mockResolvedValueOnce(snapshot('第一篇'))
    const switching = storeModule.useFilesStore.getState().switchFile('two')
    mocks.getFileCatalog.mockResolvedValue(catalog(2, [file('one')]))
    await storeModule.useFilesStore.getState().syncExternalChanges()
    staleLoad.resolve(snapshot('已删除正文'))
    await switching
    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'one', contentFileId: 'one', currentContent: '第一篇', contentStatus: 'ready' })
  })

  it.each([
    { status: 'idle' as const, contentFileId: null },
    { status: 'ready' as const, contentFileId: 'two' },
  ])('active 相同但内容状态为 $status/$contentFileId 时重新加载', async ({ status, contentFileId }) => {
    ready([file('one'), file('two')])
    storeModule.useFilesStore.setState({ contentStatus: status, contentFileId })
    mocks.getFileSnapshot.mockResolvedValue(snapshot('重试正文', 5))

    await storeModule.useFilesStore.getState().switchFile('one')

    expect(mocks.getFileSnapshot).toHaveBeenCalledWith('one')
    expect(storeModule.useFilesStore.getState()).toMatchObject({
      activeFileId: 'one',
      contentFileId: 'one',
      contentStatus: 'ready',
      currentContent: '重试正文',
      contentVersion: 5,
    })
  })

  it('writer 保存版本并发布 content signal', async () => {
    ready()
    mocks.saveFileContent.mockResolvedValue(6)
    storeModule.useFilesStore.getState().setFileContent('one', '本地正文')
    await storeModule.useFilesStore.getState().flushPendingSaves()
    expect(storeModule.useFilesStore.getState()).toMatchObject({ currentContent: '本地正文', contentVersion: 6, contentEpoch: 1 })
    expect(mocks.publishContentSignal).toHaveBeenCalledWith('one', 6)
  })

  it('首笔立即写入，短窗口内编辑仅尾随保存最新正文', async () => {
    vi.useFakeTimers()
    ready()
    mocks.saveFileContent.mockResolvedValue(6)

    storeModule.useFilesStore.getState().setFileContent('one', '首笔')
    expect(mocks.saveFileContent).toHaveBeenCalledOnce()
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '首笔')
    await vi.advanceTimersByTimeAsync(50)
    storeModule.useFilesStore.getState().setFileContent('one', '中间正文')
    await vi.advanceTimersByTimeAsync(50)
    storeModule.useFilesStore.getState().setFileContent('one', '尾随最新')

    await vi.advanceTimersByTimeAsync(50)
    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '尾随最新')
    expect(mocks.publishContentSignal).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(150)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('flush 立即释放尾随等待并排空最新正文', async () => {
    vi.useFakeTimers()
    ready()
    mocks.saveFileContent.mockResolvedValue(6)
    storeModule.useFilesStore.getState().setFileContent('one', '首笔')
    await vi.advanceTimersByTimeAsync(0)
    storeModule.useFilesStore.getState().setFileContent('one', '立即落盘')

    await expect(storeModule.useFilesStore.getState().flushPendingSaves()).resolves.toBe(true)

    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '立即落盘')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('失败草稿不进入尾随等待且 flush 仍可立即重试', async () => {
    vi.useFakeTimers()
    ready()
    mocks.saveFileContent.mockRejectedValueOnce(new mocks.FileStorageError()).mockResolvedValueOnce(7)
    storeModule.useFilesStore.getState().setFileContent('one', '失败草稿')
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)

    await expect(storeModule.useFilesStore.getState().flushPendingSaves()).resolves.toBe(true)

    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '失败草稿')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('writer 的 FileStorageError 只报告通用失败且不伪装版本成功', async () => {
    ready()
    mocks.isFileStorageError.mockReturnValue(true)
    mocks.saveFileContent.mockRejectedValue(new Error('底层机密错误'))
    storeModule.useFilesStore.getState().setFileContent('one', '未持久化正文')
    await storeModule.useFilesStore.getState().flushPendingSaves()
    expect(storeModule.useFilesStore.getState().contentVersion).toBe(1)
    expect(mocks.publishContentSignal).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('保存失败，请立即导出备份。')
  })

  it.each(['switch', 'create', 'delete'])('保存持续失败时 %s 中止且不改变当前会话', async (operation) => {
    ready([file('one'), file('two')])
    mocks.saveFileContent.mockRejectedValue(new mocks.FileStorageError())
    storeModule.useFilesStore.getState().setFileContent('one', '未保存正文')
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledOnce())
    const before = storeModule.useFilesStore.getState()

    if (operation === 'switch') {
      await storeModule.useFilesStore.getState().switchFile('two')
    }
    else if (operation === 'create') {
      await expect(storeModule.useFilesStore.getState().createFile('不会创建')).rejects.toBeInstanceOf(mocks.FileStorageError)
    }
    else {
      await storeModule.useFilesStore.getState().deleteFile('one')
    }

    expect(storeModule.useFilesStore.getState()).toMatchObject({
      files: before.files,
      activeFileId: 'one',
      contentFileId: 'one',
      currentContent: '未保存正文',
      contentStatus: 'ready',
      revision: before.revision,
    })
    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(mocks.createFileRecord).not.toHaveBeenCalled()
    expect(mocks.deleteFileRecord).not.toHaveBeenCalled()
    expect(mocks.getFileSnapshot).not.toHaveBeenCalled()
  })

  it('failed draft 可在下次 flush 重试成功且单次 flush 不会无限重试', async () => {
    ready()
    mocks.saveFileContent.mockRejectedValueOnce(new mocks.FileStorageError()).mockResolvedValueOnce(7)
    storeModule.useFilesStore.getState().setFileContent('one', '待重试正文')
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledOnce())

    await expect(storeModule.useFilesStore.getState().flushPendingSaves()).resolves.toBe(true)

    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '待重试正文')
    expect(storeModule.useFilesStore.getState().contentVersion).toBe(7)
  })

  it('两个并发 flush 共享一次成功重试', async () => {
    ready()
    const retry = deferred<number | false>()
    mocks.saveFileContent.mockRejectedValueOnce(new mocks.FileStorageError()).mockReturnValueOnce(retry.promise)
    storeModule.useFilesStore.getState().setFileContent('one', '并发草稿')
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledOnce())

    const first = storeModule.useFilesStore.getState().flushPendingSaves()
    const second = storeModule.useFilesStore.getState().flushPendingSaves()
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledTimes(2))
    retry.resolve(7)

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    expect(storeModule.useFilesStore.getState().contentVersion).toBe(7)
  })

  it('两个并发 flush 共享一次失败重试并保留草稿', async () => {
    ready()
    const retry = deferred<number | false>()
    mocks.saveFileContent.mockRejectedValueOnce(new mocks.FileStorageError()).mockReturnValueOnce(retry.promise)
    storeModule.useFilesStore.getState().setFileContent('one', '保留草稿')
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledOnce())

    const first = storeModule.useFilesStore.getState().flushPendingSaves()
    const second = storeModule.useFilesStore.getState().flushPendingSaves()
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledTimes(2))
    retry.reject(new mocks.FileStorageError())

    await expect(Promise.all([first, second])).resolves.toEqual([false, false])
    expect(mocks.saveFileContent).toHaveBeenCalledTimes(2)
    mocks.saveFileContent.mockResolvedValueOnce(8)
    await expect(storeModule.useFilesStore.getState().flushPendingSaves()).resolves.toBe(true)
    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '保留草稿')
  })

  it('新编辑覆盖 failed draft 并保存最新正文', async () => {
    ready()
    mocks.saveFileContent.mockRejectedValueOnce(new mocks.FileStorageError()).mockResolvedValueOnce(8)
    storeModule.useFilesStore.getState().setFileContent('one', '旧草稿')
    await vi.waitFor(() => expect(mocks.saveFileContent).toHaveBeenCalledOnce())

    storeModule.useFilesStore.getState().setFileContent('one', '最新草稿')
    await expect(storeModule.useFilesStore.getState().flushPendingSaves()).resolves.toBe(true)

    expect(mocks.saveFileContent).toHaveBeenLastCalledWith('one', '最新草稿')
    expect(storeModule.useFilesStore.getState()).toMatchObject({ currentContent: '最新草稿', contentVersion: 8 })
  })

  it('权威 catalog 已删除文件时清除草稿且不阻塞切换', async () => {
    ready([file('one'), file('two')])
    mocks.saveFileContent.mockResolvedValue(false)
    mocks.getFileSnapshot.mockResolvedValue(snapshot('第二篇'))
    storeModule.useFilesStore.getState().setFileContent('one', '迟到正文')

    await storeModule.useFilesStore.getState().switchFile('two')

    expect(storeModule.useFilesStore.getState()).toMatchObject({ activeFileId: 'two', currentContent: '第二篇' })
  })

  it('条件替换仅应用绑定文件的未变化正文', async () => {
    ready([file('one'), file('two')])
    const action = storeModule.useFilesStore.getState().replaceFileContentIfUnchanged

    expect(action('one', '旧正文', '格式化正文')).toBe(true)
    expect(storeModule.useFilesStore.getState().currentContent).toBe('格式化正文')
    expect(action('one', '旧正文', '过期结果')).toBe(false)
    storeModule.useFilesStore.setState({ activeFileId: 'two', contentFileId: 'two', currentContent: '第二篇' })
    expect(action('one', '格式化正文', '跨文件结果')).toBe(false)
    expect(storeModule.useFilesStore.getState().currentContent).toBe('第二篇')
  })

  it('external newer content 以最后提交者获胜并增加 contentEpoch', async () => {
    ready()
    mocks.getFileSnapshot.mockResolvedValue(snapshot('远端正文', 3))
    await storeModule.useFilesStore.getState().syncExternalChanges()
    expect(storeModule.useFilesStore.getState()).toMatchObject({ currentContent: '远端正文', contentVersion: 3, contentEpoch: 2 })
  })

  it('external snapshot 读取期间的本地编辑不被覆盖', async () => {
    ready()
    const remote = deferred<FileContentSnapshot>()
    mocks.getFileSnapshot.mockReturnValue(remote.promise)
    const syncing = storeModule.useFilesStore.getState().syncExternalChanges()
    await vi.waitFor(() => expect(mocks.getFileSnapshot).toHaveBeenCalled())
    storeModule.useFilesStore.getState().setFileContent('one', '本地新正文')
    remote.resolve(snapshot('远端正文', 9))
    await syncing
    await storeModule.useFilesStore.getState().flushPendingSaves()
    expect(storeModule.useFilesStore.getState().currentContent).toBe('本地新正文')
  })

  it('旧编辑器迟到 onChange 的 fileId 被拒绝', () => {
    ready([file('one'), file('two')], 'two')
    storeModule.useFilesStore.getState().setFileContent('one', '迟到正文')
    expect(storeModule.useFilesStore.getState().currentContent).toBe('旧正文')
    expect(mocks.saveFileContent).not.toHaveBeenCalled()
  })

  it('rename/delete 事务发布 catalog signal，外部同步不回声', async () => {
    ready([file('one'), file('two')])
    mocks.renameFileRecord.mockResolvedValue(catalog(2, [file('one', '新.md'), file('two')]))
    await storeModule.useFilesStore.getState().renameFile('one', '新')
    mocks.deleteFileRecord.mockResolvedValue({ catalog: catalog(3, [file('one', '新.md')]), nextFileId: 'one' })
    await storeModule.useFilesStore.getState().deleteFile('two')
    expect(mocks.publishCatalogSignal).toHaveBeenNthCalledWith(1, 2)
    expect(mocks.publishCatalogSignal).toHaveBeenNthCalledWith(2, 3)
    mocks.publishCatalogSignal.mockClear()
    mocks.getFileCatalog.mockResolvedValue(catalog(4, [file('one', '远端.md')]))
    await storeModule.useFilesStore.getState().syncExternalChanges()
    expect(mocks.publishCatalogSignal).not.toHaveBeenCalled()
  })

  it.each([
    ['create', () => mocks.createFileRecord.mockRejectedValue(new mocks.FileStorageError()), () => storeModule.useFilesStore.getState().createFile('失败')],
    ['delete', () => mocks.deleteFileRecord.mockRejectedValue(new mocks.FileStorageError()), () => storeModule.useFilesStore.getState().deleteFile('one')],
    ['rename', () => mocks.renameFileRecord.mockRejectedValue(new mocks.FileStorageError()), () => storeModule.useFilesStore.getState().renameFile('one', '失败')],
  ])('%s 遇到 FileStorageError 时不产生伪状态', async (_operation, reject, run) => {
    ready()
    mocks.isFileStorageError.mockReturnValue(true)
    reject()
    const before = storeModule.useFilesStore.getState()

    await expect(run()).rejects.toBeInstanceOf(mocks.FileStorageError)

    expect(storeModule.useFilesStore.getState()).toMatchObject({
      files: before.files,
      activeFileId: before.activeFileId,
      contentFileId: before.contentFileId,
      currentContent: before.currentContent,
      contentStatus: before.contentStatus,
      contentVersion: before.contentVersion,
      revision: before.revision,
    })
    expect(mocks.error).toHaveBeenCalledWith('浏览器持久化操作失败，请重试或导出内容')
  })
})
