import type { EditorView, ViewUpdate } from '@codemirror/view'

export const IMPORT_CANCELLED_MESSAGE = '插入位置已变更，已取消导入'

const targets = new WeakMap<EditorView, Set<AsyncImportTarget>>()

export function attachImportView(view: EditorView) {
  detachImportView(view)
  targets.set(view, new Set())
}

export function detachImportView(view: EditorView) {
  for (const target of targets.get(view) ?? []) target.dispose()
  targets.delete(view)
}

export function updateImportTargets(view: EditorView, transactions: ViewUpdate['transactions']) {
  for (const transaction of transactions) {
    for (const target of targets.get(view) ?? []) target.map(transaction)
  }
}

export class AsyncImportTarget {
  private valid = true
  private inserting = false
  private followSelection = true
  private selection: EditorView['state']['selection']

  constructor(private view: EditorView, private from: number, private to = from) {
    this.selection = view.state.selection
    const registered = targets.get(view)
    this.valid = !!registered
    registered?.add(this)
  }

  get active() { return this.valid }

  dispose() {
    this.valid = false
    targets.get(this.view)?.delete(this)
  }

  map(transaction: ViewUpdate['transactions'][number]) {
    if (this.inserting)
      return
    transaction.changes.iterChangedRanges((from, to) => {
      const overlaps = this.from === this.to
        ? from < to && from <= this.from && to >= this.from
        : from < this.to && to > this.from
      if (overlaps)
        this.dispose()
    })
    if (!this.valid)
      return
    const point = this.from === this.to
    this.from = transaction.changes.mapPos(this.from, 1)
    this.to = transaction.changes.mapPos(this.to, point ? 1 : -1)
    const mapped = this.selection.map(transaction.changes)
    if (!transaction.newSelection.eq(mapped))
      this.followSelection = false
    this.selection = transaction.newSelection
  }

  insert(content: string): boolean {
    if (!this.valid)
      return false
    const main = this.view.state.selection.main
    const moveSelection = this.followSelection && main.from === this.from && main.to === this.to
    const end = this.from + content.length
    this.inserting = true
    try {
      this.view.dispatch({
        changes: { from: this.from, to: this.to, insert: content },
        ...(moveSelection ? { selection: { anchor: end } } : {}),
      })
      this.from = this.to = end
      this.selection = this.view.state.selection
    }
    finally {
      this.inserting = false
    }
    return true
  }
}
