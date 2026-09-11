import { ClientOnly, createFileRoute, Outlet } from '@tanstack/react-router'
import { createClientOnlyFn } from '@tanstack/react-start'
import { lazy, Suspense } from 'react'
import { MarkdownWorkspaceLoadingFallback } from '@/components/markdown/loading-fallback'

const loadWorkspace = createClientOnlyFn(() => import('@/components/markdown/workspace.client'))
const Workspace = lazy(loadWorkspace)

export const Route = createFileRoute('/_layout')({ component: App })

function App() {
  return (
    <div className="flex h-dvh min-h-[700px] min-w-5xl flex-col overflow-hidden">
      <ClientOnly fallback={<WorkspaceFallback />}>
        <Suspense fallback={<WorkspaceFallback />}>
          <Workspace />
        </Suspense>
      </ClientOnly>
      <Outlet />
    </div>
  )
}

function WorkspaceFallback() {
  return (
    <>
      <main aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
        <MarkdownWorkspaceLoadingFallback />
      </main>
      <div aria-hidden="true" className="h-12 shrink-0 border-t bg-background" />
    </>
  )
}
