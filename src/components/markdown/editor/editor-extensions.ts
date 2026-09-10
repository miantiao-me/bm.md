import type { Extension } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { mermaid } from 'codemirror-lang-mermaid'
import { importDropPasteExtension, importViewTrackerExtension } from './file-import'
import { infographicLanguageDescription } from './infographic-language'
import { markdownCommandExtension } from './markdown-commands'

const mermaidLanguageDescription = LanguageDescription.of({
  name: 'mermaid',
  support: mermaid(),
})

export const editorCodeLanguages = [
  ...languages,
  mermaidLanguageDescription,
  infographicLanguageDescription,
]

const lineNumbersTheme = EditorView.theme({
  '.cm-lineNumbers': {
    minWidth: '2em',
  },
})

export function createEditorExtensions(scrollSyncExtensions: Extension[]): Extension[] {
  return [
    markdown({
      base: markdownLanguage,
      codeLanguages: editorCodeLanguages,
    }),
    markdownCommandExtension,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown 编辑器' }),
    lineNumbersTheme,
    ...scrollSyncExtensions,
    importViewTrackerExtension,
    importDropPasteExtension,
  ]
}
