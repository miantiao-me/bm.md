import type { IDBPDatabase, OpenDBCallbacks } from 'idb'
import type { MarkdownFile, NewStoredFile } from './file-storage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'

type StorageModule = typeof import('./file-storage')

const storageModules: StorageModule[] = []

function file(id: string, name = `${id}.md`, content = id): NewStoredFile {
  return { id, name, content, createdAt: 1, updatedAt: 1 }
}

function openNativeDatabase(version?: number, upgrade?: (database: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version ? indexedDB.open('bm.md', version) : indexedDB.open('bm.md')
    request.onupgradeneeded = () => upgrade?.(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function deleteNativeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('bm.md')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('数据库删除被阻塞'))
  })
}

async function loadStorage(): Promise<StorageModule> {
  const storage = await import('./file-storage')
  storageModules.push(storage)
  return storage
}

async function initialize(storage: StorageModule, defaultFile = file('default')) {
  return storage.initializeFileStorage({ legacyFiles: [], defaultFile })
}

beforeEach(async () => {
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
  vi.resetModules()
  vi.doUnmock('idb')
  await deleteNativeDatabase()
})

afterEach(async () => {
  await Promise.all(storageModules.splice(0).map(storage => storage.__closeFileStorage()))
  vi.doUnmock('idb')
  vi.resetModules()
  await deleteNativeDatabase()
  Reflect.deleteProperty(globalThis, 'window')
})

describe('file-storage', () => {
  it('从 v1 升级到 v2 时保留原有正文', async () => {
    const database = await openNativeDatabase(1, (db) => {
      db.createObjectStore('files', { keyPath: 'id' })
    })
    const transaction = database.transaction('files', 'readwrite')
    transaction.objectStore('files').put({ id: 'legacy', content: '旧正文' })
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve()
    })
    database.close()

    const storage = await loadStorage()
    const legacy: MarkdownFile = { id: 'legacy', name: '旧文档.md', createdAt: 1, updatedAt: 2 }
    const catalog = await storage.initializeFileStorage({ legacyFiles: [legacy], defaultFile: file('default') })

    expect(catalog).toEqual({ revision: 1, files: [legacy] })
    await expect(storage.getFileContent('legacy')).resolves.toBe('旧正文')
    await expect(storage.getFileSnapshot('legacy')).resolves.toEqual({ content: '旧正文', version: 0 })
  })

  it('首次初始化会原子写入默认 catalog 与正文', async () => {
    const storage = await loadStorage()
    const defaultFile = file('default', '默认文档.md', '默认正文')

    await expect(initialize(storage, defaultFile)).resolves.toEqual({
      revision: 1,
      files: [{ id: 'default', name: '默认文档.md', createdAt: 1, updatedAt: 1 }],
    })
    await expect(storage.getFileContent('default')).resolves.toBe('默认正文')
    await expect(storage.getFileSnapshot('default')).resolves.toEqual({ content: '默认正文', version: 1 })
  })

  it('使用合法 legacy metadata 初始化并为空缺正文补空记录', async () => {
    const storage = await loadStorage()
    const legacy = [
      { id: 'one', name: '一.md', createdAt: 1, updatedAt: 2 },
      { id: '', name: '非法.md', createdAt: 1, updatedAt: 1 },
    ]

    const catalog = await storage.initializeFileStorage({ legacyFiles: legacy, defaultFile: file('default') })

    expect(catalog.files).toEqual([legacy[0]])
    await expect(storage.getFileContent('one')).resolves.toBe('')
  })

  it('legacy metadata 过滤非法项并按顺序保留每个 ID 的首个合法项', async () => {
    const storage = await loadStorage()
    const first = { id: 'one', name: '一.md', createdAt: 1, updatedAt: 2 }
    const second = { id: 'two', name: '二.md', createdAt: 3, updatedAt: 4 }
    const legacy = [
      { ...first, name: 123 },
      first,
      { ...first, name: '重复.md' },
      { ...second, createdAt: Number.NaN },
      { ...second, updatedAt: Number.POSITIVE_INFINITY },
      { ...second, id: 123 },
      { ...second, id: '' },
      second,
    ] as MarkdownFile[]

    const catalog = await storage.initializeFileStorage({ legacyFiles: legacy, defaultFile: file('default') })

    expect(catalog.files).toEqual([first, second])
    expect(catalog.files[0]).not.toHaveProperty('content')
    first.name = '外部修改.md'
    catalog.files[1].name = '返回值修改.md'
    await expect(storage.getFileCatalog()).resolves.toMatchObject({
      files: [{ id: 'one', name: '一.md' }, { id: 'two', name: '二.md' }],
    })
  })

  it('名称去重排除自身并跳过大小写不同的已有后缀', async () => {
    const storage = await loadStorage()
    await initialize(storage, file('default', 'Note.MD'))
    const renamed = await storage.renameFileRecord('default', 'note.md')
    expect(renamed.files[0].name).toBe('note.md')

    await storage.createFileRecord(file('suffix', 'NOTE (1).MD'))
    const created = await storage.createFileRecord(file('next', 'Note.MD'))
    expect(created.file.name).toBe('Note (2).MD')
  })

  it('两个独立连接并发创建最终均存在且名称大小写不敏感唯一', async () => {
    const first = await loadStorage()
    await initialize(first)
    vi.resetModules()
    const second = await loadStorage()

    const [createdOne, createdTwo] = await Promise.all([
      first.createFileRecord(file('one', '文档')),
      second.createFileRecord(file('two', '文档.MD')),
    ])
    const catalog = await first.getFileCatalog()

    expect([createdOne.file.name, createdTwo.file.name].sort()).toEqual(['文档 (1).MD', '文档.md'].sort())
    expect(catalog.files.map(item => item.id)).toEqual(expect.arrayContaining(['default', 'one', 'two']))
    expect(catalog.revision).toBe(3)
  })

  it('rename 与 delete 交错不会复活已删除项', async () => {
    const storage = await loadStorage()
    await initialize(storage)
    await storage.createFileRecord(file('target'))

    await Promise.all([
      storage.renameFileRecord('target', '新名字'),
      storage.deleteFileRecord('target', file('replacement')),
    ])

    const catalog = await storage.getFileCatalog()
    expect(catalog.files.some(item => item.id === 'target')).toBe(false)
    await expect(storage.getFileContent('target')).resolves.toBe('')
  })

  it('rename 同时更新 updatedAt', async () => {
    const storage = await loadStorage()
    await initialize(storage)

    const catalog = await storage.renameFileRecord('default', '新名字', 99)

    expect(catalog.files[0]).toMatchObject({ name: '新名字.md', updatedAt: 99 })
  })

  it('保存先提交再删除时正文随 metadata 删除', async () => {
    const storage = await loadStorage()
    await initialize(storage)

    await expect(storage.saveFileContent('default', '新正文')).resolves.toBe(2)
    await storage.deleteFileRecord('default', file('replacement', '替代.md', '替代正文'))

    await expect(storage.getFileContent('default')).resolves.toBe('')
  })

  it('删除先提交再迟到保存时返回 false 且不复活正文', async () => {
    const storage = await loadStorage()
    await initialize(storage)
    await storage.deleteFileRecord('default', file('replacement'))

    await expect(storage.saveFileContent('default', '迟到正文')).resolves.toBe(false)
    await expect(storage.getFileContent('default')).resolves.toBe('')
  })

  it('删除最后文件会原子创建 replacement', async () => {
    const storage = await loadStorage()
    await initialize(storage)

    const result = await storage.deleteFileRecord('default', file('replacement', '替代', '替代正文'))

    expect(result.nextFileId).toBe('replacement')
    expect(result.catalog.files).toEqual([{ id: 'replacement', name: '替代.md', createdAt: 1, updatedAt: 1 }])
    await expect(storage.getFileContent('replacement')).resolves.toBe('替代正文')
  })

  it('第一 store 写入成功而第二 store 失败时 catalog 与正文均回滚', async () => {
    const storage = await loadStorage()
    await initialize(storage)
    const originalPut = IDBObjectStore.prototype.put
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === 'catalog') {
        throw new DOMException('SECOND_STORE_FAILED', 'DataError')
      }
      return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key)
    })

    await expect(
      storage.createFileRecord(file('broken', '损坏.md', '正文')),
    ).rejects.toSatisfy(storage.isFileStorageError)
    put.mockRestore()

    const database = await openNativeDatabase()
    const transaction = database.transaction(['catalog', 'files'], 'readonly')
    const catalogRequest = transaction.objectStore('catalog').get('main')
    const contentRequest = transaction.objectStore('files').get('broken')
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve()
    })
    expect(catalogRequest.result.files.some((item: MarkdownFile) => item.id === 'broken')).toBe(false)
    expect(contentRequest.result).toBeUndefined()
    expect(storage.isStorageUnavailable()).toBe(false)
    database.close()
  })

  it('运行期 IndexedDB 失败会抛持久化错误且不会切换内存成功', async () => {
    const storage = await loadStorage()
    await initialize(storage)
    const get = vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      throw new DOMException('SHOULD_NOT_LEAK', 'InvalidStateError')
    })

    await expect(storage.getFileCatalog()).rejects.toSatisfy(storage.isFileStorageError)

    get.mockRestore()
    expect(storage.isStorageUnavailable()).toBe(false)
    await expect(storage.getFileCatalog()).resolves.toMatchObject({ revision: 1 })
  })

  it('两个连接重叠保存时正文版本严格递增', async () => {
    const first = await loadStorage()
    await initialize(first)
    vi.resetModules()
    const second = await loadStorage()

    const versions = await Promise.all([
      first.saveFileContent('default', '连接一'),
      second.saveFileContent('default', '连接二'),
    ])

    expect(versions.slice().sort()).toEqual([2, 3])
    await expect(first.getFileSnapshot('default')).resolves.toMatchObject({ version: 3 })
  })

  it('indexedDB 不可用时标记状态且可在内存继续基本操作', async () => {
    vi.resetModules()
    const openDB = vi.fn().mockRejectedValue(new Error('SHOULD_NOT_LEAK'))
    vi.doMock('idb', async (importOriginal) => {
      const original = await importOriginal<typeof import('idb')>()
      return { ...original, openDB }
    })
    const storage = await loadStorage()

    await initialize(storage)
    const created = await storage.createFileRecord(file('memory', '内存'))
    await storage.renameFileRecord('memory', '重命名')
    await expect(storage.saveFileContent('memory', '内存正文')).resolves.toBe(2)
    await expect(storage.getFileContent('memory')).resolves.toBe('内存正文')
    const deleted = await storage.deleteFileRecord('memory', file('replacement'))

    expect(created.file.name).toBe('内存.md')
    expect(deleted.catalog.files.some(item => item.id === 'memory')).toBe(false)
    expect(storage.isStorageUnavailable()).toBe(true)
    expect(storage.getStorageUnavailableReason()).toBe('浏览器存储不可用，内容仅保存在内存中，刷新页面会丢失')
  })

  it('首次 create 打开失败后安全转入内存分支', async () => {
    vi.resetModules()
    const openDB = vi.fn().mockRejectedValue(new Error('OPEN_FAILED'))
    vi.doMock('idb', async (importOriginal) => {
      const original = await importOriginal<typeof import('idb')>()
      return { ...original, openDB }
    })
    const storage = await loadStorage()

    await expect(storage.createFileRecord(file('memory', '内存', '正文'))).resolves.toMatchObject({
      file: { id: 'memory', name: '内存.md' },
    })
    await expect(storage.getFileContent('memory')).resolves.toBe('正文')
    expect(openDB).toHaveBeenCalledOnce()
  })

  it('连接 terminated 后清空缓存并在下一操作重连', async () => {
    vi.resetModules()
    const callbacks: Array<OpenDBCallbacks<StorageModule>> = []
    const databases = [
      { get: vi.fn().mockResolvedValue({ key: 'main', revision: 1, files: [] }), close: vi.fn() },
      { get: vi.fn().mockResolvedValue({ key: 'main', revision: 2, files: [] }), close: vi.fn() },
    ]
    const openDB = vi.fn((_name: string, _version: number, options: OpenDBCallbacks<StorageModule>) => {
      callbacks.push(options)
      return Promise.resolve(databases[callbacks.length - 1] as unknown as IDBPDatabase<StorageModule>)
    })
    vi.doMock('idb', async (importOriginal) => {
      const original = await importOriginal<typeof import('idb')>()
      return { ...original, openDB }
    })
    const storage = await loadStorage()

    await expect(storage.getFileCatalog()).resolves.toMatchObject({ revision: 1 })
    callbacks[0].terminated?.()
    await expect(storage.getFileCatalog()).resolves.toMatchObject({ revision: 2 })

    expect(openDB).toHaveBeenCalledTimes(2)
  })

  it('曾成功连接后的 open reject 不会永久缓存 rejected Promise', async () => {
    vi.resetModules()
    const callbacks: Array<OpenDBCallbacks<StorageModule>> = []
    const first = { get: vi.fn().mockResolvedValue({ key: 'main', revision: 1, files: [] }), close: vi.fn() }
    const third = { get: vi.fn().mockResolvedValue({ key: 'main', revision: 3, files: [] }), close: vi.fn() }
    const openDB = vi.fn((_name: string, _version: number, options: OpenDBCallbacks<StorageModule>) => {
      callbacks.push(options)
      if (callbacks.length === 1) {
        return Promise.resolve(first as unknown as IDBPDatabase<StorageModule>)
      }
      if (callbacks.length === 2) {
        return Promise.reject(new Error('REOPEN_FAILED'))
      }
      return Promise.resolve(third as unknown as IDBPDatabase<StorageModule>)
    })
    vi.doMock('idb', async (importOriginal) => {
      const original = await importOriginal<typeof import('idb')>()
      return { ...original, openDB }
    })
    const storage = await loadStorage()

    await storage.getFileCatalog()
    callbacks[0].terminated?.()
    await expect(storage.getFileCatalog()).rejects.toSatisfy(storage.isFileStorageError)
    await expect(storage.getFileCatalog()).resolves.toMatchObject({ revision: 3 })

    expect(openDB).toHaveBeenCalledTimes(3)
    expect(storage.isStorageUnavailable()).toBe(false)
  })

  it('upgrade blocked 超时后保持内存 fallback 并关闭迟到连接', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    let resolveOpen: ((database: IDBPDatabase<StorageModule>) => void) | undefined
    const close = vi.fn()
    const openDB = vi.fn((_name: string, _version: number, callbacks: OpenDBCallbacks<StorageModule>) => {
      callbacks.blocked?.(1, 2, new Event('blocked') as unknown as IDBVersionChangeEvent)
      return new Promise<IDBPDatabase<StorageModule>>((resolve) => {
        resolveOpen = resolve
      })
    })
    vi.doMock('idb', async (importOriginal) => {
      const original = await importOriginal<typeof import('idb')>()
      return { ...original, openDB }
    })
    const storage = await loadStorage()
    const initialization = initialize(storage)

    await vi.advanceTimersByTimeAsync(storage.OPEN_BLOCKED_TIMEOUT_MS)
    await expect(initialization).resolves.toMatchObject({ revision: 1 })
    expect(storage.getStorageUnavailableReason()).toContain('升级被其他页面阻塞')

    resolveOpen?.({ close } as unknown as IDBPDatabase<StorageModule>)
    await vi.advanceTimersByTimeAsync(0)
    vi.useRealTimers()
    expect(close).toHaveBeenCalledOnce()
    expect(storage.isStorageUnavailable()).toBe(true)
    await expect(storage.saveFileContent('default', '内存正文')).resolves.toBe(2)
  })
})
