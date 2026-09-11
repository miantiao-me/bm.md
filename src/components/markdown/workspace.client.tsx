import { useEffect, useState } from 'react'
import { CommandPalette } from '@/components/command-palette'
import MarkdownEditor from '@/components/markdown/editor'
import { FooterBar } from '@/components/markdown/footer-bar'
import { MarkdownWorkspaceLoadingFallback } from '@/components/markdown/loading-fallback'
import MarkdownPreviewer from '@/components/markdown/previewer'
import { restorePreviewScrollState } from '@/components/markdown/previewer/restore-scroll-state'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useFilesSync } from '@/hooks/use-files-sync'
import { prepareMarkdownWorker } from '@/lib/markdown/prepare-worker'
import { isFileContentReady, useFilesStore } from '@/stores/files'

function preloadWorkspaceModules() {
  return Promise.all([
    import('@/components/markdown/editor/editor'),
    import('@/components/markdown/previewer/render'),
  ])
}

export default function Workspace() {
  const isFileReady = useFilesStore(isFileContentReady)
  const [areModulesReady, setAreModulesReady] = useState(false)

  useFilesSync()

  useEffect(() => {
    void prepareMarkdownWorker()
  }, [])

  useEffect(() => {
    let canceled = false

    void preloadWorkspaceModules().then(
      () => {
        if (!canceled) {
          setAreModulesReady(true)
        }
      },
      () => {
        if (!canceled) {
          setAreModulesReady(true)
        }
      },
    )

    return () => {
      canceled = true
    }
  }, [])

  const isLoading = !isFileReady || !areModulesReady

  return (
    <>
      <main
        aria-busy={isLoading}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <ResizablePanelGroup
          orientation="horizontal"
          onLayoutChanged={(_, meta) => {
            if (meta.isUserInteraction)
              restorePreviewScrollState()
          }}
        >
          <ResizablePanel defaultSize="50%" minSize="512px">
            <MarkdownEditor />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="50%" minSize="512px">
            <MarkdownPreviewer />
          </ResizablePanel>
        </ResizablePanelGroup>
        {isLoading && (
          <div className="absolute inset-0 z-10">
            <MarkdownWorkspaceLoadingFallback />
          </div>
        )}
      </main>
      <FooterBar />
      <CommandPalette />
    </>
  )
}
