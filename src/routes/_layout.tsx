import { ClientOnly, createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CommandPalette } from '@/components/command-palette'
import { FileReplaceDialog } from '@/components/dialog/file-replace-dialog'
import MarkdownEditor from '@/components/markdown/editor'
import { FooterBar } from '@/components/markdown/footer-bar'
import MarkdownPreviewer from '@/components/markdown/previewer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export const Route = createFileRoute('/_layout')({ component: App })

function App() {
  useEffect(() => {
    const prepareWorker = async () => {
      const { worker } = await import('@/lib/markdown/browser')
      worker.prepare()
    }

    prepareWorker()
  }, [])

  return (
    <div
      className={`
        flex h-screen min-h-[700px] min-w-5xl flex-col overflow-hidden
        supports-[height:100dvh]:h-dvh
      `}
    >
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
        <FileReplaceDialog />
      </ClientOnly>
      <Outlet />
    </div>
  )
}
