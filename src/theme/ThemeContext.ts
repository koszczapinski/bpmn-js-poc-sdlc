import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export const THEMES: readonly Theme[] = ['light', 'dark']
export const DEFAULT_THEME: Theme = 'light'

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>.')
  return value
}
