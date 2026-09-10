import type { TransactionSpec } from '@codemirror/state'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { expect, it } from 'vitest'
import { AsyncImportTarget, attachImportView, detachImportView, updateImportTargets } from './async-import-target'

function setup() {
  let state = EditorState.create({ doc: 'AB', selection: { anchor: 1 } })
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
  return view
}

it('点位输入后跟随输入末尾，不覆盖用户输入', () => {
  const view = setup()
  const target = new AsyncImportTarget(view, 1)
  view.dispatch({ changes: { from: 1, insert: '用户' } })
  expect(target.insert('导入')).toBe(true)
  expect(view.state.doc.toString()).toBe('A用户导入B')
  expect(view.state.selection.main.anchor).toBe(1)
  target.dispose()
  expect(target.insert('重复')).toBe(false)
  detachImportView(view)
})

it('销毁只取消原视图目标，新视图不继承任何目标', () => {
  const oldView = setup()
  const oldTarget = new AsyncImportTarget(oldView, 1)
  detachImportView(oldView)
  const newView = setup()
  const newTarget = new AsyncImportTarget(newView, 1)
  expect(oldTarget.insert('旧')).toBe(false)
  expect(newTarget.insert('新')).toBe(true)
  expect(oldView.state.doc.toString()).toBe('AB')
  expect(newView.state.doc.toString()).toBe('A新B')
  detachImportView(newView)
  expect(newTarget.active).toBe(false)
})

it('未安装生命周期跟踪时不派发导入', () => {
  const view = setup()
  detachImportView(view)
  expect(new AsyncImportTarget(view, 1).insert('导入')).toBe(false)
})

it('删除范围恰好结束于插入点时仍保守取消', () => {
  const view = setup()
  const target = new AsyncImportTarget(view, 1)
  view.dispatch({ changes: { from: 0, to: 1 } })
  expect(target.active).toBe(false)
  expect(target.insert('导入')).toBe(false)
  expect(view.state.doc.toString()).toBe('B')
  detachImportView(view)
})

it('用户仍停留在原点位时将光标移到导入末尾', () => {
  const view = setup()
  const target = new AsyncImportTarget(view, 1)
  target.insert('导入')
  expect(view.state.selection.main.anchor).toBe(3)
  detachImportView(view)
})
