import { ClientOnly, createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CommandPalette } from '@/components/command-palette'
import { ImageUploadDialog } from '@/components/dialog/image-upload-dialog'
import MarkdownEditor from '@/components/markdown/editor'
import { FooterBar } from '@/components/markdown/footer-bar'
import MarkdownPreviewer from '@/components/markdown/previewer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useFilesSync } from '@/hooks/use-files-sync'

export const Route = createFileRoute('/_layout')({ component: App })

function App() {
  useFilesSync()

  useEffect(() => {
    const prepareWorker = async () => {
      const { worker } = await import('@/lib/markdown/browser')
      worker.prepare()
    }

    prepareWorker()
  }, [])

  return (
    <div className="flex h-dvh min-h-[700px] min-w-5xl flex-col overflow-hidden">
      <ResizablePanelGroup tagName="main" className="flex-1" direction="horizontal">
        <ResizablePanel defaultSize={50} style={{ minWidth: 512 }}>
          <MarkdownEditor></MarkdownEditor>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} style={{ minWidth: 512 }}>
          <MarkdownPreviewer></MarkdownPreviewer>
        </ResizablePanel>
      </ResizablePanelGroup>
      <FooterBar></FooterBar>
      <ClientOnly>
        <CommandPalette />
      </ClientOnly>
      <ImageUploadDialog />
      <Outlet />
    </div>
  )
}
