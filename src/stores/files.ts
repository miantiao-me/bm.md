import type { StoreApi } from 'zustand'
import type { FileCatalog, MarkdownFile } from '@/lib/file-storage'

import { toast } from 'sonner'
import { create } from 'zustand'
import defaultMarkdown from '@/docs/features.md?raw'
import {
  createFileRecord,
  deleteFileRecord,
  FileStorageError,
  getFileCatalog,
  getFileSnapshot,
  getStorageUnavailableReason,
  initializeFileStorage,
  isFileStorageError,
  isStorageUnavailable,
  renameFileRecord,
} from '@/lib/file-storage'
import { publishCatalogSignal, publishContentSignal } from '@/lib/files-sync'
import { createFileWriters } from './file-writers'

export type { MarkdownFile } from '@/lib/file-storage'
export { defaultMarkdown }

type ContentStatus = 'idle' | 'loading' | 'ready'

interface FileContentReadyState {
  activeFileId: string | null
  contentFileId: string | null
  contentStatus: ContentStatus
}

export function isFileContentReady(state: FileContentReadyState): boolean {
  return state.activeFileId !== null && state.contentStatus === 'ready' && state.contentFileId === state.activeFileId
}

interface FilesState {
  files: MarkdownFile[]
  activeFileId: string | null
  currentContent: string
  isInitialized: boolean
  revision: number
  contentStatus: ContentStatus
  contentFileId: string | null
  contentVersion: number
  contentEpoch: number
  setFileContent: (fileId: string, content: string) => void
  replaceFileContentIfUnchanged: (fileId: string, expectedContent: string, nextContent: string) => boolean
  setCurrentContent: (content: string) => void
  createFile: (name?: string, content?: string) => Promise<string>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, name: string) => Promise<void>
  switchFile: (id: string) => Promise<void>
  getActiveFile: () => MarkdownFile | undefined
  initialize: () => Promise<void>
  syncExternalChanges: () => Promise<void>
  refreshCatalog: () => Promise<void>
  flushPendingSaves: () => Promise<boolean>
}

interface LegacyState {
  files: MarkdownFile[]
  activeFileId: string | null
  exists: boolean
}

type SetState = StoreApi<FilesState>['setState']
type GetState = StoreApi<FilesState>['getState']

const LEGACY_KEY = 'bm.md.files'
const SESSION_ACTIVE_KEY = 'bm.md.files.active'
const DEFAULT_FILE_NAME = 'bm.md'
const STORAGE_FAILURE_MESSAGE = '浏览器持久化操作失败，请重试或导出内容'
const SAVE_FAILURE_MESSAGE = '保存失败，请立即导出备份。'
function getSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  }
  catch {
    return null
  }
}

const fileSessionStorage = getSessionStorage()

const fileWriters = createFileWriters({
  onSaveResult: handleSaveResult,
  onFailure: error => reportStorageFailure(error, SAVE_FAILURE_MESSAGE),
})
let activeIntentToken = 0
let contentLoadToken = 0
let localEditEpoch = 0
let initPromise: Promise<void> | null = null
let storageUnavailableWarned = false

function extractH1Title(content: string): string | null {
  for (const line of content.split('\n')) {
    if (line.startsWith('# ')) {
      return line.slice(2).trim().replace(/[*_`[\]]/g, '').trim() || null
    }
  }
  return null
}

function isMarkdownFile(value: unknown): value is MarkdownFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return 'id' in value && typeof value.id === 'string'
    && 'name' in value && typeof value.name === 'string'
    && 'createdAt' in value && typeof value.createdAt === 'number'
    && 'updatedAt' in value && typeof value.updatedAt === 'number'
}

function readLegacyState(): LegacyState {
  let exists = false
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw === null) {
      return { files: [], activeFileId: null, exists: false }
    }
    exists = true
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('state' in parsed)) {
      return { files: [], activeFileId: null, exists: true }
    }
    const state = parsed.state
    if (typeof state !== 'object' || state === null) {
      return { files: [], activeFileId: null, exists: true }
    }
    const files = 'files' in state && Array.isArray(state.files) ? state.files.filter(isMarkdownFile) : []
    const activeFileId = 'activeFileId' in state && (typeof state.activeFileId === 'string' || state.activeFileId === null)
      ? state.activeFileId
      : null
    return { files, activeFileId, exists: true }
  }
  catch {
    return { files: [], activeFileId: null, exists }
  }
}

function readSessionActive(): { id: string | null, exists: boolean } {
  try {
    const id = fileSessionStorage?.getItem(SESSION_ACTIVE_KEY) ?? null
    return { id, exists: id !== null }
  }
  catch {
    return { id: null, exists: false }
  }
}

function writeSessionActive(id: string | null): void {
  try {
    if (!fileSessionStorage) {
      return
    }
    if (id) {
      fileSessionStorage.setItem(SESSION_ACTIVE_KEY, id)
    }
    else {
      fileSessionStorage.removeItem(SESSION_ACTIVE_KEY)
    }
  }
  catch {
    // 会话存储不可用时仅保留内存状态。
  }
}

function warnStorageUnavailable(): void {
  if (isStorageUnavailable() && !storageUnavailableWarned) {
    storageUnavailableWarned = true
    toast.warning(getStorageUnavailableReason())
  }
}

function reportStorageFailure(error: unknown, message = STORAGE_FAILURE_MESSAGE): void {
  if (isFileStorageError(error)) {
    console.error('文件存储操作失败')
    toast.error(message)
  }
}

function defaultFile() {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: extractH1Title(defaultMarkdown) ?? DEFAULT_FILE_NAME,
    content: defaultMarkdown,
    createdAt: now,
    updatedAt: now,
  }
}

function applyCatalog(catalog: FileCatalog, setState: SetState, getState: GetState): void {
  const state = getState()
  if (catalog.revision > state.revision || (state.files.length === 0 && !state.isInitialized && catalog.revision === state.revision)) {
    setState({ files: catalog.files, revision: catalog.revision })
  }
}

async function recoverCreateIntent(
  intentToken: number,
  previousActiveId: string | null,
  setState: SetState,
  getState: GetState,
): Promise<void> {
  if (intentToken !== activeIntentToken) {
    return
  }
  const state = getState()
  if (state.contentStatus !== 'loading' || state.activeFileId !== previousActiveId) {
    return
  }
  ++contentLoadToken
  setState({ contentFileId: null, currentContent: '', contentStatus: 'idle', contentVersion: 0 })
  await reconcileCatalog(setState, getState, previousActiveId, intentToken)
}

async function activate(
  id: string,
  setState: SetState,
  getState: GetState,
  intentToken = activeIntentToken,
  throwOnError = false,
): Promise<void> {
  if (intentToken !== activeIntentToken) {
    return
  }
  if (!getState().files.some(file => file.id === id)) {
    await reconcileCatalog(setState, getState, undefined, intentToken, throwOnError)
    return
  }
  const state = getState()
  if (state.activeFileId === id && state.contentFileId === id && (state.contentStatus === 'ready' || state.contentStatus === 'loading')) {
    return
  }

  const previousContentId = state.contentFileId
  if ([previousContentId, id].some(fileId => fileId && fileWriters.hasPending(fileId))) {
    if (!await fileWriters.flushFiles([previousContentId, id])) {
      return
    }
  }
  if (intentToken !== activeIntentToken || !getState().files.some(file => file.id === id)) {
    return
  }
  const loadToken = ++contentLoadToken
  setState({ activeFileId: id, contentFileId: id, currentContent: '', contentStatus: 'loading', contentVersion: 0 })
  writeSessionActive(id)
  if (loadToken !== contentLoadToken || intentToken !== activeIntentToken) {
    return
  }

  try {
    const snapshot = await getFileSnapshot(id)
    warnStorageUnavailable()
    const current = getState()
    if (loadToken !== contentLoadToken || intentToken !== activeIntentToken || current.activeFileId !== id || current.contentFileId !== id) {
      return
    }
    if (!current.files.some(file => file.id === id)) {
      await reconcileCatalog(setState, getState, undefined, intentToken, throwOnError)
      return
    }
    setState(state => ({
      currentContent: snapshot.content,
      contentStatus: 'ready',
      contentVersion: snapshot.version,
      contentEpoch: state.contentEpoch + 1,
    }))
  }
  catch (error) {
    if (!throwOnError) {
      reportStorageFailure(error)
    }
    if (loadToken === contentLoadToken && intentToken === activeIntentToken) {
      setState({ contentStatus: 'idle', contentFileId: null, currentContent: '', contentVersion: 0 })
    }
    if (throwOnError) {
      throw error
    }
  }
}

async function reconcileCatalog(
  setState: SetState,
  getState: GetState,
  preferredId?: string | null,
  intentToken = activeIntentToken,
  throwOnError = false,
): Promise<void> {
  if (intentToken !== activeIntentToken) {
    return
  }
  const state = getState()
  const activeExists = state.activeFileId !== null && state.files.some(file => file.id === state.activeFileId)
  if (activeExists) {
    if (state.contentFileId === state.activeFileId && (state.contentStatus === 'ready' || state.contentStatus === 'loading')) {
      return
    }
    await activate(state.activeFileId!, setState, getState, intentToken, throwOnError)
    return
  }

  const sessionId = readSessionActive().id
  const nextId = [preferredId, sessionId, state.files[0]?.id]
    .find(candidate => candidate && state.files.some(file => file.id === candidate)) ?? null
  if (!nextId) {
    ++contentLoadToken
    setState({ activeFileId: null, contentFileId: null, currentContent: '', contentStatus: 'idle', contentVersion: 0 })
    writeSessionActive(null)
    return
  }
  await activate(nextId, setState, getState, intentToken, throwOnError)
}

export const useFilesStore = create<FilesState>()((set, get) => ({
  files: [],
  activeFileId: null,
  currentContent: '',
  isInitialized: false,
  revision: 0,
  contentStatus: 'idle',
  contentFileId: null,
  contentVersion: 0,
  contentEpoch: 0,

  setFileContent: (fileId, content) => {
    const state = get()
    if (state.contentStatus !== 'ready' || fileId !== state.activeFileId || fileId !== state.contentFileId) {
      return
    }
    ++localEditEpoch
    set({ currentContent: content })
    fileWriters.save(fileId, content)
  },

  replaceFileContentIfUnchanged: (fileId, expectedContent, nextContent) => {
    const state = get()
    if (
      state.contentStatus !== 'ready'
      || state.activeFileId !== fileId
      || state.contentFileId !== fileId
      || state.currentContent !== expectedContent
    ) {
      return false
    }
    get().setFileContent(fileId, nextContent)
    return true
  },

  setCurrentContent: (content) => {
    const fileId = get().contentFileId
    if (fileId) {
      get().setFileContent(fileId, content)
    }
  },

  createFile: async (name, content = '') => {
    const intentToken = ++activeIntentToken
    const previousActiveId = get().activeFileId
    if (!await fileWriters.flushFile(get().contentFileId)) {
      await recoverCreateIntent(intentToken, previousActiveId, set, get)
      throw new FileStorageError()
    }
    const before = get().revision
    const id = crypto.randomUUID()
    const now = Date.now()
    try {
      const result = await createFileRecord({
        id,
        name: name ?? extractH1Title(content) ?? DEFAULT_FILE_NAME,
        content,
        createdAt: now,
        updatedAt: now,
      })
      warnStorageUnavailable()
      applyCatalog(result.catalog, set, get)
      await reconcileCatalog(set, get, undefined, intentToken)
      if (intentToken === activeIntentToken && get().files.some(file => file.id === result.file.id)) {
        ++contentLoadToken
        set(state => ({
          activeFileId: result.file.id,
          contentFileId: result.file.id,
          currentContent: content,
          contentStatus: 'ready',
          contentVersion: 1,
          contentEpoch: state.contentEpoch + 1,
        }))
        writeSessionActive(result.file.id)
      }
      if (result.catalog.revision > before && !isStorageUnavailable()) {
        publishCatalogSignal(result.catalog.revision)
      }
      return id
    }
    catch (error) {
      reportStorageFailure(error)
      await recoverCreateIntent(intentToken, previousActiveId, set, get)
      throw error
    }
  },

  deleteFile: async (id) => {
    const state = get()
    if (!await fileWriters.flushFiles([state.contentFileId, id])) {
      return
    }
    const before = get().revision
    try {
      const result = await deleteFileRecord(id, defaultFile())
      warnStorageUnavailable()
      applyCatalog(result.catalog, set, get)
      await reconcileCatalog(set, get, result.nextFileId)
      if (result.catalog.revision > before && !isStorageUnavailable()) {
        publishCatalogSignal(result.catalog.revision)
      }
    }
    catch (error) {
      reportStorageFailure(error)
      throw error
    }
  },

  renameFile: async (id, name) => {
    const before = get().revision
    try {
      const catalog = await renameFileRecord(id, name, Date.now())
      warnStorageUnavailable()
      applyCatalog(catalog, set, get)
      await reconcileCatalog(set, get)
      if (catalog.revision > before && !isStorageUnavailable()) {
        publishCatalogSignal(catalog.revision)
      }
    }
    catch (error) {
      reportStorageFailure(error)
      throw error
    }
  },

  switchFile: async (id) => {
    const state = get()
    const isAlreadyActive = state.activeFileId === id
      && state.contentFileId === id
      && (state.contentStatus === 'ready' || state.contentStatus === 'loading')
    if (isAlreadyActive || !state.files.some(file => file.id === id)) {
      return
    }
    const intentToken = ++activeIntentToken
    await activate(id, set, get, intentToken)
  },

  getActiveFile: () => get().files.find(file => file.id === get().activeFileId),

  initialize: async () => {
    if (get().isInitialized) {
      return
    }
    if (initPromise) {
      return initPromise
    }
    const initialIntent = activeIntentToken
    initPromise = (async () => {
      const legacy = readLegacyState()
      const session = readSessionActive()
      const catalog = await initializeFileStorage({ legacyFiles: legacy.files, defaultFile: defaultFile() })
      warnStorageUnavailable()
      if (!isStorageUnavailable() && legacy.exists) {
        try {
          localStorage.removeItem(LEGACY_KEY)
        }
        catch {
          // 迁移清理失败不阻塞初始化。
        }
      }
      applyCatalog(catalog, set, get)
      const preferred = session.exists ? session.id : legacy.activeFileId
      await reconcileCatalog(set, get, initialIntent === activeIntentToken ? preferred : undefined, activeIntentToken, true)
      set({ isInitialized: true })
    })().catch((error) => {
      reportStorageFailure(error)
      throw error
    }).finally(() => {
      initPromise = null
    })
    return initPromise
  },

  syncExternalChanges: async () => {
    try {
      if (!get().isInitialized) {
        if (initPromise) {
          await initPromise
        }
        else {
          await get().initialize()
        }
      }

      const catalog = await getFileCatalog()
      warnStorageUnavailable()
      applyCatalog(catalog, set, get)
      await reconcileCatalog(set, get)

      let state = get()
      if (state.contentStatus !== 'ready' || !state.contentFileId || state.contentFileId !== state.activeFileId) {
        return
      }
      const fileId = state.contentFileId
      if (fileWriters.hasPending(fileId) && !await fileWriters.flushFile(fileId)) {
        return
      }
      state = get()
      if (state.contentStatus !== 'ready' || state.contentFileId !== fileId || state.activeFileId !== fileId) {
        return
      }
      const editEpoch = localEditEpoch
      const snapshot = await getFileSnapshot(fileId)
      warnStorageUnavailable()
      const current = get()
      if (
        editEpoch === localEditEpoch
        && current.contentStatus === 'ready'
        && current.activeFileId === fileId
        && current.contentFileId === fileId
        && snapshot.version > current.contentVersion
      ) {
        set(state => ({
          currentContent: snapshot.content,
          contentVersion: snapshot.version,
          contentEpoch: state.contentEpoch + 1,
        }))
      }
    }
    catch (error) {
      reportStorageFailure(error)
    }
  },

  refreshCatalog: () => get().syncExternalChanges(),
  flushPendingSaves: () => fileWriters.flushAll(),
}))

function handleSaveResult(id: string, version: number | false): void {
  warnStorageUnavailable()
  if (version === false) {
    return
  }
  useFilesStore.setState((state) => {
    if (state.contentFileId !== id) {
      return state
    }
    return { contentVersion: Math.max(state.contentVersion, version) }
  })
  if (!isStorageUnavailable()) {
    publishContentSignal(id, version)
  }
}
