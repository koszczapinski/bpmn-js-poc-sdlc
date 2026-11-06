import { createContext, useContext } from 'react'
import type { Finding } from '../domain/types'
import type { Locale, MessageKey } from './messages'
import type { MessageParams, UiText } from './translate'

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: MessageParams) => string
  text: (text: UiText) => string
  finding: (finding: Finding) => string
  typeLabel: (type: string) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>.')
  return value
}
