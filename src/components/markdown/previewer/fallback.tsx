export function PreviewerFallback() {
  return (
    <div className={`
      flex h-full w-full flex-col items-center justify-center bg-background/50
      p-4 backdrop-blur-sm select-none
    `}
    >
      <div className={`
        doto-font flex text-7xl font-bold text-muted-foreground/30
        md:text-9xl
      `}
      >
        <span className={`
          animate-wave-bounce
          [animation-delay:0.2s]
        `}
        >
          m
        </span>
        <span className={`
          animate-wave-bounce
          [animation-delay:0.3s]
        `}
        >
          d
        </span>
      </div>
    </div>
  )
}
