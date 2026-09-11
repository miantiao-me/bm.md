import type { DBSchema, IDBPDatabase, IDBPTransaction, StoreNames } from 'idb'
import { openDB } from 'idb'

import { getMarkdownFileExtension } from '@/lib/markdown-file'

export interface MarkdownFile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface FileCatalog {
  revision: number
  files: MarkdownFile[]
}

export interface NewStoredFile extends MarkdownFile {
  content: string
}

export interface FileContentSnapshot {
  content: string
  version: number
}

interface CatalogRecord extends FileCatalog {
  key: 'main'
}

interface FileDB extends DBSchema {
  files: {
    key: string
    value: { id: string, content: string, version?: number }
  }
  catalog: {
    key: 'main'
    value: CatalogRecord
  }
}

interface InitializeFileStorageOptions {
  legacyFiles: MarkdownFile[]
  defaultFile: NewStoredFile
}

const DB_NAME = 'bm.md'
const DB_VERSION = 2
const CATALOG_KEY = 'main'
const DEFAULT_FILE_NAME = 'bm.md'
const STORAGE_UNAVAILABLE_REASON = '浏览器存储不可用，内容仅保存在内存中，刷新页面会丢失'
const STORAGE_BLOCKED_REASON = '浏览器存储升级被其他页面阻塞，内容仅保存在内存中，刷新页面会丢失'
const PERSISTENCE_ERROR_MESSAGE = '浏览器持久化操作失败，请重试或导出内容'
export const OPEN_BLOCKED_TIMEOUT_MS = 1_000

export class FileStorageError extends Error {
  constructor() {
    super(PERSISTENCE_ERROR_MESSAGE)
    this.name = 'FileStorageError'
  }
}

export function isFileStorageError(error: unknown): error is FileStorageError {
  return error instanceof FileStorageError
}

let db: Promise<IDBPDatabase<FileDB>> | null = null
let dbGeneration = 0
let dbEverOpened = false
let dbUnavailable = false
let dbUnavailableReason = ''
let memoryCatalog: FileCatalog | null = null
const memorySnapshots = new Map<string, FileContentSnapshot>()

function cloneFile(file: MarkdownFile): MarkdownFile {
  return {
    id: file.id,
    name: file.name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }
}

function cloneCatalog(catalog: FileCatalog): FileCatalog {
  return { revision: catalog.revision, files: catalog.files.map(cloneFile) }
}

function toCatalog(record: CatalogRecord): FileCatalog {
  return cloneCatalog(record)
}

function toCatalogRecord(catalog: FileCatalog): CatalogRecord {
  return { key: CATALOG_KEY, ...cloneCatalog(catalog) }
}

function mirrorCatalog(catalog: FileCatalog): FileCatalog {
  memoryCatalog = cloneCatalog(catalog)
  return cloneCatalog(catalog)
}

function markStorageUnavailable(reason = STORAGE_UNAVAILABLE_REASON): void {
  void db?.then(database => database.close()).catch(() => undefined)
  dbUnavailable = true
  dbUnavailableReason = reason
  db = null
}

function storageError(): FileStorageError {
  return new FileStorageError()
}

function canUseMemoryFallback(): boolean {
  return dbUnavailable && !dbEverOpened
}

function getDB(): Promise<IDBPDatabase<FileDB>> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined' || dbUnavailable) {
    if (!dbUnavailable && !dbEverOpened) {
      markStorageUnavailable()
    }
    return Promise.reject(storageError())
  }

  if (!db) {
    const generation = ++dbGeneration
    let blockedTimer: ReturnType<typeof setTimeout> | undefined
    let rejectBlocked: (() => void) | undefined
    const blocked = new Promise<never>((_, reject) => {
      rejectBlocked = () => reject(storageError())
    })
    const opening = Promise.resolve().then(() => openDB<FileDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('files', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          database.createObjectStore('catalog', { keyPath: 'key' })
        }
      },
      blocked() {
        blockedTimer ??= setTimeout(() => {
          if (!dbEverOpened) {
            markStorageUnavailable(STORAGE_BLOCKED_REASON)
          }
          rejectBlocked?.()
        }, OPEN_BLOCKED_TIMEOUT_MS)
      },
      blocking() {
        void opening.then(database => database.close()).catch(() => undefined)
        if (generation === dbGeneration) {
          db = null
        }
      },
      terminated() {
        if (generation === dbGeneration) {
          db = null
        }
      },
    }))
    const guardedOpening = opening.then((database) => {
      if (blockedTimer) {
        clearTimeout(blockedTimer)
      }
      if (dbUnavailable) {
        database.close()
        throw storageError()
      }
      dbEverOpened = true
      return database
    })
    const cachedOpening = Promise.race([guardedOpening, blocked]).catch(() => {
      if (blockedTimer) {
        clearTimeout(blockedTimer)
      }
      if (!dbUnavailable && !dbEverOpened) {
        markStorageUnavailable()
      }
      throw storageError()
    })
    db = cachedOpening
    void cachedOpening.catch(() => {
      if (db === cachedOpening) {
        db = null
      }
    })
  }
  return db
}

async function abortTransaction(
  transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'>,
): Promise<void> {
  try {
    transaction.abort()
  }
  catch {
    // 事务可能已经由失败的 request 自动中止。
  }
  await transaction.done.catch(() => undefined)
}

function snapshot(record?: { content: string, version?: number }): FileContentSnapshot {
  return { content: record?.content ?? '', version: record?.version ?? 0 }
}

function mirrorSnapshot(id: string, value: FileContentSnapshot): FileContentSnapshot {
  const mirrored = { ...value }
  memorySnapshots.set(id, mirrored)
  return { ...mirrored }
}

function normalizeFileName(name: string): string {
  const trimmed = name.trim() || DEFAULT_FILE_NAME
  return getMarkdownFileExtension(trimmed) ? trimmed : `${trimmed}.md`
}

function ensureUniqueName(name: string, files: MarkdownFile[], excludeId?: string): string {
  const normalized = normalizeFileName(name)
  const extension = getMarkdownFileExtension(normalized) ?? '.md'
  const baseName = normalized.slice(0, -extension.length)
  const names = new Set<string>()
  for (const file of files) {
    if (file.id !== excludeId) {
      names.add(file.name.toLocaleLowerCase())
    }
  }
  if (!names.has(normalized.toLocaleLowerCase())) {
    return normalized
  }

  let suffix = 1
  while (names.has(`${baseName} (${suffix})${extension}`.toLocaleLowerCase())) {
    suffix++
  }
  return `${baseName} (${suffix})${extension}`
}

function isValidLegacyFile(value: MarkdownFile): boolean {
  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.name === 'string'
    && Number.isFinite(value.createdAt)
    && Number.isFinite(value.updatedAt)
}

function validLegacyFiles(files: MarkdownFile[]): MarkdownFile[] {
  const ids = new Set<string>()
  const validFiles: MarkdownFile[] = []
  for (const file of files) {
    if (!isValidLegacyFile(file) || ids.has(file.id)) {
      continue
    }
    ids.add(file.id)
    validFiles.push(cloneFile(file))
  }
  return validFiles
}

async function readCatalogFromTransaction(
  transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'>,
): Promise<FileCatalog> {
  const record = await transaction.objectStore('catalog').get(CATALOG_KEY)
  return record ? toCatalog(record) : { revision: 0, files: [] }
}

function fallbackCatalog(): FileCatalog {
  return cloneCatalog(memoryCatalog ?? { revision: 0, files: [] })
}

function initializeInMemory(options: InitializeFileStorageOptions): FileCatalog {
  if (memoryCatalog) {
    return cloneCatalog(memoryCatalog)
  }
  const legacyFiles = validLegacyFiles(options.legacyFiles)
  const hasLegacyFiles = legacyFiles.length > 0
  const files = hasLegacyFiles ? legacyFiles : [cloneFile(options.defaultFile)]
  for (const file of files) {
    if (!memorySnapshots.has(file.id)) {
      memorySnapshots.set(file.id, {
        content: hasLegacyFiles ? '' : options.defaultFile.content,
        version: 1,
      })
    }
  }
  return mirrorCatalog({ revision: 1, files })
}

export function isStorageUnavailable(): boolean {
  return dbUnavailable
}

export function getStorageUnavailableReason(): string {
  return dbUnavailableReason
}

export async function initializeFileStorage(options: InitializeFileStorageOptions): Promise<FileCatalog> {
  if (dbUnavailable) {
    return initializeInMemory(options)
  }

  let database: IDBPDatabase<FileDB>
  try {
    database = await getDB()
  }
  catch {
    if (dbUnavailable) {
      return initializeInMemory(options)
    }
    throw storageError()
  }

  let transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'> | undefined
  try {
    transaction = database.transaction(['files', 'catalog'], 'readwrite')
    const existing = await transaction.objectStore('catalog').get(CATALOG_KEY)
    if (existing) {
      await transaction.done
      return mirrorCatalog(toCatalog(existing))
    }

    const legacyFiles = validLegacyFiles(options.legacyFiles)
    const files = legacyFiles.length > 0 ? legacyFiles : [cloneFile(options.defaultFile)]
    const filesStore = transaction.objectStore('files')
    const knownSnapshots = new Map<string, FileContentSnapshot>()
    for (const file of files) {
      const record = await filesStore.get(file.id)
      if (!record) {
        const content = legacyFiles.length > 0 ? '' : options.defaultFile.content
        await filesStore.put({ id: file.id, content, version: 1 })
        knownSnapshots.set(file.id, { content, version: 1 })
      }
    }
    const catalog: FileCatalog = { revision: 1, files }
    await transaction.objectStore('catalog').put(toCatalogRecord(catalog))
    await transaction.done
    for (const [id, value] of knownSnapshots) {
      mirrorSnapshot(id, value)
    }
    return mirrorCatalog(catalog)
  }
  catch {
    if (transaction) {
      await abortTransaction(transaction)
    }
    throw storageError()
  }
}

export async function getFileCatalog(): Promise<FileCatalog> {
  if (dbUnavailable) {
    return fallbackCatalog()
  }
  try {
    const database = await getDB()
    const record = await database.get('catalog', CATALOG_KEY)
    return mirrorCatalog(record ? toCatalog(record) : { revision: 0, files: [] })
  }
  catch {
    if (canUseMemoryFallback()) {
      return fallbackCatalog()
    }
    throw storageError()
  }
}

export async function createFileRecord(input: NewStoredFile): Promise<{ catalog: FileCatalog, file: MarkdownFile }> {
  if (dbUnavailable) {
    const current = fallbackCatalog()
    const file = { ...input, name: ensureUniqueName(input.name, current.files) }
    const catalog = { revision: current.revision + 1, files: [...current.files, cloneFile(file)] }
    memorySnapshots.set(file.id, { content: input.content, version: 1 })
    return { catalog: mirrorCatalog(catalog), file: cloneFile(file) }
  }
  let transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'> | undefined
  try {
    const database = await getDB()
    transaction = database.transaction(['files', 'catalog'], 'readwrite')
    const current = await readCatalogFromTransaction(transaction)
    const file: MarkdownFile = { ...input, name: ensureUniqueName(input.name, current.files) }
    const catalog = { revision: current.revision + 1, files: [...current.files, file] }
    await transaction.objectStore('files').put({ id: file.id, content: input.content, version: 1 })
    await transaction.objectStore('catalog').put(toCatalogRecord(catalog))
    await transaction.done
    memorySnapshots.set(file.id, { content: input.content, version: 1 })
    return { catalog: mirrorCatalog(catalog), file: cloneFile(file) }
  }
  catch {
    if (transaction) {
      await abortTransaction(transaction)
    }
    if (!transaction && canUseMemoryFallback()) {
      return createFileRecord(input)
    }
    throw storageError()
  }
}

export async function renameFileRecord(id: string, name: string, updatedAt = Date.now()): Promise<FileCatalog> {
  if (dbUnavailable) {
    const current = fallbackCatalog()
    if (!current.files.some(file => file.id === id)) {
      return current
    }
    const uniqueName = ensureUniqueName(name, current.files, id)
    return mirrorCatalog({
      revision: current.revision + 1,
      files: current.files.map(file => file.id === id ? { ...file, name: uniqueName, updatedAt } : file),
    })
  }
  let transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'> | undefined
  try {
    const database = await getDB()
    transaction = database.transaction(['files', 'catalog'], 'readwrite')
    const current = await readCatalogFromTransaction(transaction)
    if (!current.files.some(file => file.id === id)) {
      await transaction.done
      return mirrorCatalog(current)
    }
    const uniqueName = ensureUniqueName(name, current.files, id)
    const catalog = {
      revision: current.revision + 1,
      files: current.files.map(file => file.id === id ? { ...file, name: uniqueName, updatedAt } : file),
    }
    await transaction.objectStore('catalog').put(toCatalogRecord(catalog))
    await transaction.done
    return mirrorCatalog(catalog)
  }
  catch {
    if (transaction) {
      await abortTransaction(transaction)
    }
    if (!transaction && canUseMemoryFallback()) {
      return renameFileRecord(id, name, updatedAt)
    }
    throw storageError()
  }
}

export async function deleteFileRecord(
  id: string,
  replacement: NewStoredFile,
): Promise<{ catalog: FileCatalog, nextFileId: string | null }> {
  if (dbUnavailable) {
    const current = fallbackCatalog()
    const index = current.files.findIndex(file => file.id === id)
    if (index < 0) {
      return { catalog: current, nextFileId: null }
    }
    let files = current.files.filter(file => file.id !== id)
    memorySnapshots.delete(id)
    let nextFileId = files[index]?.id ?? files[index - 1]?.id ?? null
    if (files.length === 0) {
      const file = { ...replacement, name: ensureUniqueName(replacement.name, files) }
      files = [file]
      memorySnapshots.set(file.id, { content: replacement.content, version: 1 })
      nextFileId = file.id
    }
    return { catalog: mirrorCatalog({ revision: current.revision + 1, files }), nextFileId }
  }
  let transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'> | undefined
  try {
    const database = await getDB()
    transaction = database.transaction(['files', 'catalog'], 'readwrite')
    const current = await readCatalogFromTransaction(transaction)
    const index = current.files.findIndex(file => file.id === id)
    if (index < 0) {
      await transaction.done
      return { catalog: mirrorCatalog(current), nextFileId: null }
    }
    let files = current.files.filter(file => file.id !== id)
    let nextFileId = files[index]?.id ?? files[index - 1]?.id ?? null
    await transaction.objectStore('files').delete(id)
    if (files.length === 0) {
      const file = { ...replacement, name: ensureUniqueName(replacement.name, files) }
      files = [file]
      await transaction.objectStore('files').put({ id: file.id, content: replacement.content, version: 1 })
      nextFileId = file.id
    }
    const catalog = { revision: current.revision + 1, files }
    await transaction.objectStore('catalog').put(toCatalogRecord(catalog))
    await transaction.done
    memorySnapshots.delete(id)
    if (nextFileId === replacement.id && files.length === 1) {
      memorySnapshots.set(replacement.id, { content: replacement.content, version: 1 })
    }
    return { catalog: mirrorCatalog(catalog), nextFileId }
  }
  catch {
    if (transaction) {
      await abortTransaction(transaction)
    }
    if (!transaction && canUseMemoryFallback()) {
      return deleteFileRecord(id, replacement)
    }
    throw storageError()
  }
}

export async function getFileSnapshot(id: string): Promise<FileContentSnapshot> {
  if (dbUnavailable) {
    return { ...(memorySnapshots.get(id) ?? { content: '', version: 0 }) }
  }
  try {
    const database = await getDB()
    const record = await database.get('files', id)
    return mirrorSnapshot(id, snapshot(record))
  }
  catch {
    if (canUseMemoryFallback()) {
      return { ...(memorySnapshots.get(id) ?? { content: '', version: 0 }) }
    }
    throw storageError()
  }
}

export async function getFileContent(id: string): Promise<string> {
  return (await getFileSnapshot(id)).content
}

export async function saveFileContent(
  id: string,
  content: string,
): Promise<number | false> {
  if (dbUnavailable) {
    if (!memoryCatalog?.files.some(file => file.id === id)) {
      return false
    }
    const version = (memorySnapshots.get(id)?.version ?? 0) + 1
    memorySnapshots.set(id, { content, version })
    return version
  }
  let transaction: IDBPTransaction<FileDB, StoreNames<FileDB>[], 'readwrite'> | undefined
  try {
    const database = await getDB()
    transaction = database.transaction(['files', 'catalog'], 'readwrite')
    const catalog = await readCatalogFromTransaction(transaction)
    if (!catalog.files.some(file => file.id === id)) {
      await transaction.done
      mirrorCatalog(catalog)
      return false
    }
    const current = await transaction.objectStore('files').get(id)
    const version = (current?.version ?? 0) + 1
    await transaction.objectStore('files').put({ id, content, version })
    await transaction.done
    mirrorCatalog(catalog)
    memorySnapshots.set(id, { content, version })
    return version
  }
  catch {
    if (transaction) {
      await abortTransaction(transaction)
    }
    if (!transaction && canUseMemoryFallback()) {
      return saveFileContent(id, content)
    }
    throw storageError()
  }
}

export async function __closeFileStorage(): Promise<void> {
  const current = db
  ++dbGeneration
  db = null
  if (current) {
    const database = await current.catch(() => null)
    database?.close()
  }
}

export async function __resetFileStorage(): Promise<void> {
  await __closeFileStorage()
  memoryCatalog = null
  memorySnapshots.clear()
  dbUnavailable = false
  dbUnavailableReason = ''
  dbEverOpened = false
  if (typeof indexedDB !== 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(storageError())
      request.onblocked = () => reject(storageError())
    })
  }
}
