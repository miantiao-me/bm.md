import { ClientOnly } from '@tanstack/react-router'
import { lazy } from 'react'
import { EditorFallback } from './fallback'

const CodeMirrorEditor = lazy(() => import('./editor'))

export default function MarkdownEditor() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-editor">
      <div
        className="flex flex-1 items-center justify-center"
      >
        <ClientOnly fallback={<EditorFallback />}>
          <CodeMirrorEditor />
        </ClientOnly>
      </div>
    </div>
  )
}
