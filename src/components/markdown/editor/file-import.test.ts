import type { TransactionSpec } from '@codemirror/state'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { toast } from 'sonner'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { attachImportView, detachImportView, updateImportTargets } from './async-import-target'
import './file-import'

const mocks = vi.hoisted(() => ({ parse: vi.fn(), paste: null as unknown as (event: ClipboardEvent, view: EditorView) => void }))
vi.mock('@codemirror/view', async (original) => {
  const actual = await original<typeof import('@codemirror/view')>()
  return {
    ...actual,
    EditorView: class extends actual.EditorView {
      static domEventHandlers(handlers: Parameters<typeof actual.EditorView.domEventHandlers>[0]) {
        mocks.paste = handlers.paste as typeof mocks.paste
        return actual.EditorView.domEventHandlers(handlers)
      }
    },
  }
})
vi.mock('@/lib/markdown/browser', () => ({ markdown: { parse: mocks.parse } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

function setup() {
  let state = EditorState.create({ doc: 'A旧内容B', selection: { anchor: 1, head: 4 } })
  const view = {
    get state() { return state },
    dispatch(spec: TransactionSpec) {
      const transaction = state.update(spec)
      state = transaction.state
      // Node mock 使用直接依赖的 state；应用由 Vite dedupe 统一 view/state 实例。
      updateImportTargets(view, [transaction] as unknown as ViewUpdate['transactions'])
    },
  } as unknown as EditorView
  attachImportView(view)
  let resolve!: (value: { result: string }) => void
  let reject!: (error: Error) => void
  mocks.parse.mockReturnValue(new Promise<{ result: string }>((done, fail) => {
    resolve = done
    reject = fail
  }))
  const paste = () => mocks.paste({
    preventDefault: vi.fn(),
    clipboardData: { items: [], files: [], getData: (type: string) => type === 'text/html' ? '<p>新</p>' : '新' },
  } as unknown as ClipboardEvent, view)
  paste()
  return {
    view,
    paste,
    finish: async (outcome: 'success' | 'info' = 'success') => {
      await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledOnce())
      resolve({ result: '新' })
      await vi.waitFor(() => expect(toast[outcome]).toHaveBeenCalledExactlyOnceWith(
        outcome === 'success' ? 'HTML 解析成功' : '插入位置已变更，已取消导入',
      ))
      expect(toast[outcome === 'success' ? 'info' : 'success']).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    },
    fail: async () => {
      await vi.waitFor(() => expect(mocks.parse).toHaveBeenCalledOnce())
      reject(new Error('解析失败'))
      await vi.waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith('HTML 解析失败'))
    },
  }
}

it('解析 HTML 期间映射两侧修改，并保留后来移动的选区', async () => {
  const { view, finish } = setup()
  view.dispatch({ changes: [{ from: 0, insert: '前' }, { from: 5, insert: '后' }], selection: { anchor: 0 } })
  await finish()
  expect(view.state.doc.toString()).toBe('前A新B后')
  expect(view.state.selection.main.anchor).toBe(0)
  detachImportView(view)
})

it.each(['内部输入', '删除', '销毁', '重挂载'])('粘贴 HTML 的目标%s后不覆盖内容', async (action) => {
  const { view, finish } = setup()
  if (action === '内部输入')
    view.dispatch({ changes: { from: 2, insert: '用户' } })
  if (action === '删除')
    view.dispatch({ changes: { from: 1, to: 4 } })
  if (action === '销毁')
    detachImportView(view)
  if (action === '重挂载')
    attachImportView(view)
  const before = view.state.doc.toString()
  await finish('info')
  expect(view.state.doc.toString()).toBe(before)
  expect(toast.success).not.toHaveBeenCalled()
  detachImportView(view)
})

it('导入 HTML 成功后释放旧目标，后续编辑与新导入不受影响', async () => {
  const first = setup()
  await first.finish()
  expect(first.view.state.selection.main.anchor).toBe(2)
  first.view.dispatch({ changes: { from: 0, to: 3, insert: '另一个文档' } })
  vi.clearAllMocks()
  const second = setup()
  await second.finish()
  expect(second.view.state.doc.toString()).toBe('A新B')
  expect(first.view.state.doc.toString()).toBe('另一个文档')
  detachImportView(first.view)
  detachImportView(second.view)
})

it('解析 HTML 失败后可在同一视图再次导入', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { view, paste, fail } = setup()
  await fail()
  expect(view.state.doc.toString()).toBe('A旧内容B')
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.info).not.toHaveBeenCalled()
  vi.clearAllMocks()
  mocks.parse.mockResolvedValue({ result: '重试' })
  paste()
  await vi.waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith('HTML 解析成功'))
  expect(view.state.doc.toString()).toBe('A重试B')
  expect(toast.error).not.toHaveBeenCalled()
  expect(toast.info).not.toHaveBeenCalled()
  detachImportView(view)
})
