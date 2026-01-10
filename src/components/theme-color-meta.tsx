import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'
import { appConfig } from '@/config'

const THEME_ANIMATION_HALF = 250

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme()
  const isFirstRender = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const color = resolvedTheme === 'dark'
      ? appConfig.themeColor.dark
      : appConfig.themeColor.light

    const updateThemeColor = () => {
      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', color)
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (isFirstRender.current) {
      isFirstRender.current = false
      updateThemeColor()
    }
    else {
      timerRef.current = setTimeout(updateThemeColor, THEME_ANIMATION_HALF)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [resolvedTheme])

  return null
}
