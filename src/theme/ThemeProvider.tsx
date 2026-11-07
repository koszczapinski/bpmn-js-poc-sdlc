import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_THEME, ThemeContext, type Theme } from './ThemeContext'

/** Holds the selected theme. It is UI state only: not stored, and the OS setting is not read. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
