import { cn } from '@/lib/utils'

interface MarkdownLoadingFallbackProps {
  animationDelayMs?: number
  brand?: string
  label: string
}

export function MarkdownLoadingFallback({ animationDelayMs = 0, brand, label }: MarkdownLoadingFallbackProps) {
  const characterOccurrences = new Map<string, number>()
  const brandCharacters = Array.from(brand ?? '', (character) => {
    const occurrence = characterOccurrences.get(character) ?? 0
    characterOccurrences.set(character, occurrence + 1)
    return { character, key: `${character}-${occurrence}` }
  })

  return (
    <div
      role="status"
      className={`
        flex size-full flex-col items-center justify-center bg-background/50 p-4
        backdrop-blur-sm select-none
      `}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {brand && (
          <span className={`
            doto-font flex text-7xl font-bold text-foreground/30
            md:text-9xl
          `}
          >
            {brandCharacters.map(({ character, key }, index) => (
              <span
                key={key}
                className={cn(
                  'animate-wave-bounce',
                  character === '.' && 'text-primary/30',
                )}
                style={{ animationDelay: `${animationDelayMs + index * 100}ms` }}
              >
                {character}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  )
}

export function MarkdownWorkspaceLoadingFallback() {
  return <MarkdownLoadingFallback brand="bm.md" label="加载 bm.md…" />
}
