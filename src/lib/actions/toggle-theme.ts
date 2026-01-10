export function toggleTheme(
  isDark: boolean,
  setTheme: (theme: string) => void,
) {
  const newTheme = isDark ? 'light' : 'dark'
  if (!document.startViewTransition) {
    setTheme(newTheme)
    return
  }
  document.startViewTransition(() => {
    setTheme(newTheme)
  })
}
