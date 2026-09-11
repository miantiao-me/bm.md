import { ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { isFileContentReady, useFilesStore } from '@/stores/files'
import MarkdownPreviewerSidebar from './sidebar'

const MarkdownRender = lazy(() => import('./render'))

export default function MarkdownPreviewer() {
  const isReady = useFilesStore(isFileContentReady)

  return (
    <div className="flex size-full overflow-hidden bg-editor">
      <div className="flex flex-1 items-center justify-center p-4">
        {isReady
          ? (
              <ClientOnly fallback={null}>
                <Suspense fallback={null}>
                  <MarkdownRender />
                </Suspense>
              </ClientOnly>
            )
          : null}
      </div>
      <MarkdownPreviewerSidebar />
    </div>
  )
}
