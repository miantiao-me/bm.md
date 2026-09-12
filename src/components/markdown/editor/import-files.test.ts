import type { TransactionSpec } from '@codemirror/state'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/stores/editor'
import { attachImportView, detachImportView, updateImportTargets } from './async-import-target'
import { importFilesToEditor } from './import-files'

const mocks = vi.hoisted(() => ({
  parseFileToMarkdown: vi.fn(),
  prepareImageImport: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    loading: vi.fn(() => 'toast'),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/file-importer', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/file-importer')>()
  return { ...original, parseFileToMarkdown: mocks.parseFileToMarkdown }
})

vi.mock('@/lib/image-import', () => ({ prepareImageImport: mocks.prepareImageImport }))

function file(name: string, type = ''): File {
  return new File(['内容'], name, { type })
}

function createView(initial = ''): { view: EditorView, content: () => string } {
  let state = EditorState.create({ doc: initial })
  const view = {
    get state() { return state },
    dispatch: (spec: TransactionSpec) => {
      const transaction = state.update(spec)
      state = transaction.state
      // Node mock 使用直接依赖的 state；应用由 Vite dedupe 统一 view/state 实例。
      updateImportTargets(view, [transaction] as unknown as ViewUpdate['transactions'])
    },
  } as unknown as EditorView
  attachImportView(view)
  return { view, content: () => state.doc.toString() }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.clearAllMocks()
  useEditorStore.setState({
    enableImageOcr: false,
    enableEnhancedImageOcr: false,
  })
})
afterEach(() => vi.restoreAllMocks())

describe('编辑器文件插入', () => {
  it('上传期间映射输入位置并保留后来移动的光标', async () => {
    const pending = deferred<{ kind: 'image', content: string }>()
    mocks.prepareImageImport.mockReturnValue(pending.promise)
    const { view, content } = createView('AB')
    const task = importFilesToEditor(view, [file('图.png', 'image/png')], 1)
    view.dispatch({ changes: { from: 0, insert: '前' }, selection: { anchor: 0 } })
    pending.resolve({ kind: 'image', content: '![图.png](/图)\n\n' })
    await task
    expect(content()).toBe('前A![图.png](/图)\n\nB')
    expect(view.state.selection.main.anchor).toBe(0)
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('图片上传成功: 图.png', { id: 'toast' })
    expect(toast.info).not.toHaveBeenCalled()
  })

  it.each(['删除', '销毁', '重挂载'])('%s后取消上传结果并结束提示', async (action) => {
    const pending = deferred<{ kind: 'image', content: string }>()
    mocks.prepareImageImport.mockReturnValue(pending.promise)
    const { view, content } = createView('AB')
    const task = importFilesToEditor(view, [file('图.png', 'image/png')], 1)
    if (action === '删除')
      view.dispatch({ changes: { from: 0, to: 2 } })
    else if (action === '销毁')
      detachImportView(view)
    else attachImportView(view)
    pending.resolve({ kind: 'image', content: '![图.png](/图)\n\n' })
    await task
    expect(content()).toBe(action === '删除' ? '' : 'AB')
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledExactlyOnceWith('插入位置已变更，已取消导入', { id: 'toast' })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it.each([false, true])('上传失败时结束 loading，目标失效状态为 %s', async (cancelled) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pending = deferred<{ kind: 'image', content: string }>()
    mocks.prepareImageImport.mockReturnValue(pending.promise)
    const { view, content } = createView('AB')
    const task = importFilesToEditor(view, [file('图.png', 'image/png')], 1)
    expect(toast.loading).toHaveBeenCalledExactlyOnceWith('正在上传 图.png…')
    if (cancelled)
      detachImportView(view)
    pending.reject(new Error('上传失败'))
    await task
    expect(content()).toBe('AB')
    expect(toast.success).not.toHaveBeenCalled()
    if (cancelled) {
      expect(toast.info).toHaveBeenCalledExactlyOnceWith('插入位置已变更，已取消导入', { id: 'toast' })
      expect(toast.error).not.toHaveBeenCalled()
    }
    else {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith('上传失败', { id: 'toast' })
      expect(toast.info).not.toHaveBeenCalled()
    }
    detachImportView(view)
  })

  it('上传抛出非 Error 时显示文件名', async () => {
    mocks.prepareImageImport.mockRejectedValue('上传失败')
    const { view } = createView()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await importFilesToEditor(view, [file('图.png', 'image/png')], 0)

    expect(toast.error).toHaveBeenCalledExactlyOnceWith('图片上传失败: 图.png', { id: 'toast' })
  })

  it('并行批次独立映射，批内顺序与分隔符保持', async () => {
    const first = deferred<{ content: string, kind: string }>()
    const second = deferred<{ content: string, kind: string }>()
    mocks.parseFileToMarkdown.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValueOnce({ content: '三', kind: 'document' })
    const { view, content } = createView('AB')
    const one = importFilesToEditor(view, [file('一.pdf'), file('三.pdf')], 1)
    const two = importFilesToEditor(view, [file('二.pdf')], 1)
    second.resolve({ content: '二', kind: 'document' })
    await two
    view.dispatch({ changes: { from: 0, insert: '前' } })
    first.resolve({ content: '一', kind: 'document' })
    await one
    expect(content()).toBe('前A二一\n\n三B')
  })
  it('用两个换行分隔连续文档', async () => {
    mocks.parseFileToMarkdown
      .mockResolvedValueOnce({ content: '正文', kind: 'document' })
      .mockResolvedValueOnce({ content: '# 标题', kind: 'document' })
    const { view, content } = createView()

    await importFilesToEditor(view, [file('一.pdf'), file('二.docx')], 0)
    expect(content()).toBe('正文\n\n# 标题')
  })

  it('连续文档只补足到两个换行', async () => {
    mocks.parseFileToMarkdown
      .mockResolvedValueOnce({ content: '一\n\n', kind: 'document' })
      .mockResolvedValueOnce({ content: '二\n', kind: 'document' })
      .mockResolvedValueOnce({ content: '三', kind: 'document' })
    const { view, content } = createView()

    await importFilesToEditor(view, [file('一.pdf'), file('二.pdf'), file('三.pdf')], 0)
    expect(content()).toBe('一\n\n二\n\n三')
  })

  it('首项失败后第二项仍从原位置插入', async () => {
    mocks.parseFileToMarkdown
      .mockRejectedValueOnce(new Error('失败'))
      .mockResolvedValueOnce({ content: '第二份', kind: 'document' })
    const { view, content } = createView('AB')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await importFilesToEditor(view, [file('失败.pdf'), file('成功.pdf')], 1)
    expect(content()).toBe('A第二份B')
  })

  it('按输入顺序插入文档、图片和文档', async () => {
    mocks.parseFileToMarkdown
      .mockResolvedValueOnce({ content: '一', kind: 'document' })
      .mockResolvedValueOnce({ content: '二', kind: 'document' })
    mocks.prepareImageImport.mockResolvedValue({ kind: 'image', content: '![图.png](/image.png)\n\n' })
    const { view, content } = createView()

    await importFilesToEditor(view, [file('一.pdf'), file('图.png', 'image/png'), file('二.pdf')], 0)
    expect(content()).toBe('一\n\n![图.png](/image.png)\n\n二')
  })

  it('图片 MIME 优先，不调用文档转换', async () => {
    mocks.prepareImageImport.mockResolvedValue({ kind: 'image', content: '![伪装.docx](/image.png)\n\n' })
    const image = file('伪装.docx', 'image/png')
    const { view, content } = createView()

    await importFilesToEditor(view, [image], 0)

    expect(mocks.parseFileToMarkdown).not.toHaveBeenCalled()
    expect(mocks.prepareImageImport).toHaveBeenCalledExactlyOnceWith(image, false, false)
    expect(content()).toBe('![伪装.docx](/image.png)\n\n')
  })

  it.each([false, true])('ocr 开启时仅插入识别文本，增强=%s', async (enhanced) => {
    useEditorStore.setState({
      enableImageOcr: true,
      enableEnhancedImageOcr: enhanced,
    })
    mocks.prepareImageImport.mockResolvedValue({ kind: 'text', content: '第一行\n第二行' })
    const image = file('图.png', 'image/png')
    const { view, content } = createView('AB')

    await importFilesToEditor(view, [image], 1)

    expect(mocks.prepareImageImport).toHaveBeenCalledExactlyOnceWith(image, true, enhanced)
    expect(content()).toBe('A第一行\n第二行B')
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('已识别 图.png', { id: 'toast' })
  })

  it('ocr 未识别到文字时不插入内容', async () => {
    useEditorStore.setState({ enableImageOcr: true })
    mocks.prepareImageImport.mockResolvedValue({ kind: 'text', content: '' })
    const { view, content } = createView('AB')

    await importFilesToEditor(view, [file('空白.png', 'image/png')], 1)

    expect(content()).toBe('AB')
    expect(toast.info).toHaveBeenCalledExactlyOnceWith('空白.png 中未识别到文字', { id: 'toast' })
  })

  it('ocr 失败时不回退上传图片', async () => {
    useEditorStore.setState({ enableImageOcr: true })
    mocks.prepareImageImport.mockRejectedValue(new Error('模型加载失败'))
    const image = file('图.png', 'image/png')
    const { view, content } = createView('AB')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await importFilesToEditor(view, [image], 1)

    expect(content()).toBe('AB')
    expect(mocks.prepareImageImport).toHaveBeenCalledExactlyOnceWith(image, true, false)
    expect(toast.error).toHaveBeenCalledExactlyOnceWith('无法识别 图.png，请重试', { id: 'toast' })
  })
})
