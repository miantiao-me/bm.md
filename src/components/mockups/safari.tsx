import type { HTMLAttributes, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Lock, PanelLeft, Plus, RefreshCw, Share, SquareStack } from 'lucide-react'

const HEADER_HEIGHT = 52

type SafariMode = 'default' | 'simple'

export interface SafariProps extends HTMLAttributes<HTMLDivElement> {
  url?: string
  imageSrc?: string
  videoSrc?: string
  mode?: SafariMode
  children?: ReactNode
}

export function Safari({
  imageSrc,
  videoSrc,
  children,
  url,
  mode = 'default',
  className,
  style,
  ...props
}: SafariProps) {
  const hasVideo = !!videoSrc
  const hasImage = !!imageSrc
  const hasChildren = !!children
  const hasMedia = hasVideo || hasImage

  return (
    <div
      className={`
        relative flex w-full flex-col overflow-hidden rounded-xl border
        border-neutral-300/60
        dark:border-neutral-600/60
        ${className ?? ''}
      `}
      style={style}
      {...props}
    >
      <div
        className={`
          relative flex w-full shrink-0 items-center justify-between
          rounded-t-xl bg-[#fcfcfc] px-5
          dark:bg-[#1f2430]
        `}
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex shrink-0 items-center gap-5">
          <div className="flex items-center gap-2">
            <div className={`
              size-3 rounded-full bg-[#e6e8eb]
              dark:bg-[#282e3b]
            `}
            />
            <div className={`
              size-3 rounded-full bg-[#e6e8eb]
              dark:bg-[#282e3b]
            `}
            />
            <div className={`
              size-3 rounded-full bg-[#e6e8eb]
              dark:bg-[#282e3b]
            `}
            />
          </div>

          {mode === 'default' && (
            <div className="flex items-center gap-3 text-neutral-400">
              <PanelLeft className="size-4" strokeWidth={1.5} />
              <ChevronLeft className="size-4" strokeWidth={1.5} />
              <ChevronRight className="size-4" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className={`
          pointer-events-none absolute inset-0 flex items-center justify-center
          px-32
        `}
        >
          <div className={`
            pointer-events-auto flex w-full max-w-md items-center justify-center
            gap-1.5 rounded-md bg-[#e6e8eb] px-3 py-1.5
            dark:bg-[#282e3b]
          `}
          >
            <Lock className="size-3 shrink-0 text-neutral-400" strokeWidth={2} />
            <span className="truncate text-xs text-neutral-400">
              {url}
            </span>
          </div>
        </div>

        {mode === 'default' && (
          <div className="flex shrink-0 items-center gap-4 text-neutral-400">
            <Share className="size-4" strokeWidth={1.5} />
            <Plus className="size-4" strokeWidth={1.5} />
            <SquareStack className="size-4" strokeWidth={1.5} />
            <RefreshCw className="size-4" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className={`
        relative min-h-0 flex-1 overflow-hidden bg-[#e6e8eb]
        dark:bg-[#282e3b]
      `}
      >
        {hasVideo && (
          <video
            className="block size-full object-cover"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}

        {!hasVideo && hasImage && (
          <img
            src={imageSrc}
            alt=""
            className="block size-full object-cover object-top"
          />
        )}

        {hasChildren && !hasMedia && (
          <div className="size-full">{children}</div>
        )}
      </div>
    </div>
  )
}
