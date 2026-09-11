import { saveFileContent } from '@/lib/file-storage'

interface Writer {
  forceFlush: boolean
  latest: string | null
  promise: Promise<void>
  releaseTail: (() => void) | null
  tailTimer: ReturnType<typeof setTimeout> | null
}

interface WriterCallbacks {
  onSaveResult: (id: string, version: number | false) => void
  onFailure: (error: unknown) => void
}

const SAVE_TAIL_MS = 150

function releaseWriterTail(writer: Writer): void {
  writer.forceFlush = true
  writer.releaseTail?.()
}

function waitForWriterTail(writer: Writer): Promise<void> {
  if (writer.forceFlush) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      if (writer.tailTimer !== null) {
        clearTimeout(writer.tailTimer)
        writer.tailTimer = null
      }
      writer.releaseTail = null
      resolve()
    }
    writer.releaseTail = finish
    writer.tailTimer = setTimeout(finish, SAVE_TAIL_MS)
  })
}

export function createFileWriters({ onSaveResult, onFailure }: WriterCallbacks) {
  const writers = new Map<string, Writer>()
  const failedDrafts = new Map<string, string>()
  const flushPromises = new Map<string, Promise<boolean>>()

  function start(id: string, content: string): Writer {
    failedDrafts.set(id, content)
    const existing = writers.get(id)
    if (existing) {
      existing.latest = content
      return existing
    }

    const writer: Writer = {
      forceFlush: false,
      latest: null,
      promise: Promise.resolve(),
      releaseTail: null,
      tailTimer: null,
    }
    writer.promise = (async () => {
      let next: string | null = content
      while (next !== null) {
        const saving = next
        next = null
        try {
          const version = await saveFileContent(id, saving)
          onSaveResult(id, version)
          if (version === false) {
            failedDrafts.delete(id)
            writer.latest = null
            break
          }
          if (failedDrafts.get(id) === saving) {
            failedDrafts.delete(id)
          }
          await waitForWriterTail(writer)
        }
        catch (error) {
          onFailure(error)
          failedDrafts.set(id, writer.latest ?? saving)
          writer.latest = null
          break
        }
        next = writer.latest
        writer.latest = null
      }
    })().finally(() => {
      writer.releaseTail?.()
      writers.delete(id)
    })
    writers.set(id, writer)
    return writer
  }

  function flushFile(id: string | null): Promise<boolean> {
    if (!id) {
      return Promise.resolve(true)
    }
    const existing = flushPromises.get(id)
    if (existing) {
      return existing
    }

    const operation = (async () => {
      const running = writers.get(id)
      if (running) {
        releaseWriterTail(running)
        await running.promise
      }
      const failedDraft = failedDrafts.get(id)
      if (failedDraft === undefined) {
        return true
      }
      const retryWriter = start(id, failedDraft)
      releaseWriterTail(retryWriter)
      await retryWriter.promise
      return !failedDrafts.has(id)
    })()
    const flushing = operation.finally(() => {
      if (flushPromises.get(id) === flushing) {
        flushPromises.delete(id)
      }
    })
    flushPromises.set(id, flushing)
    return flushing
  }

  async function flushAll(): Promise<boolean> {
    const ids = new Set([...writers.keys(), ...failedDrafts.keys()])
    const results = await Promise.all([...ids].map(id => flushFile(id)))
    return results.every(Boolean)
  }

  async function flushFiles(ids: Array<string | null>): Promise<boolean> {
    for (const id of new Set(ids)) {
      if (!await flushFile(id)) {
        return false
      }
    }
    return true
  }

  return {
    save: (id: string, content: string): void => { start(id, content) },
    hasPending: (id: string): boolean => writers.has(id) || failedDrafts.has(id),
    flushFile,
    flushFiles,
    flushAll,
  }
}
