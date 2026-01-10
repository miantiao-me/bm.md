import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView, keymap } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'
import { useEditorScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { exportMarkdown } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import { useEditorStore } from '@/stores/editor'
import { useMarkdownStore } from '@/stores/markdown'
import { getAyuCodeMirrorTheme } from '@/themes/codemirror'
import { importDropPasteExtension, importViewTrackerExtension } from './file-import'

export default function CodeMirrorEditor() {
  const content = useMarkdownStore(state => state.content)
  const setContent = useMarkdownStore(state => state.setContent)
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
      ...editorExtensions,
      importViewTrackerExtension,
      importDropPasteExtension,
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            trackEvent('export', 'markdown', 'hotkey')
            exportMarkdown(useMarkdownStore.getState().content)
            return true
          },
        },
      ]),
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
