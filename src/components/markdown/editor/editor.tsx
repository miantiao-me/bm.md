import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'
import { useEditorScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { getAyuCodeMirrorTheme } from '@/themes/codemirror'
import { importDropPasteExtension, importViewTrackerExtension } from './file-import'

const lineNumbersTheme = EditorView.theme({
  '.cm-lineNumbers': {
    minWidth: '2em',
  },
})

export default function CodeMirrorEditor() {
  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const { theme } = useTheme()

  const { editorExtensions, onCreateEditor } = useEditorScrollSync({
    enabled: enableScrollSync,
  })

  const editorTheme = useMemo(
    () => getAyuCodeMirrorTheme(theme as 'light' | 'dark'),
    [theme],
  )

  const extensions = useMemo(
    () => [
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Markdown 编辑器' }),
      lineNumbersTheme,
      ...editorExtensions,
      importViewTrackerExtension,
      importDropPasteExtension,
    ],
    [editorExtensions],
  )

  return (
    <CodeMirror
      value={content}
      width="100%"
      height="100%"
      theme={editorTheme}
      extensions={extensions}
      onChange={setContent}
      className="size-full"
      basicSetup={{
        autocompletion: false,
      }}
      onCreateEditor={onCreateEditor}
    />
  )
}
