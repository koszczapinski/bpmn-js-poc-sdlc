import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, type I18n } from './I18nContext'
import { formatFinding } from './formatFinding'
import { DEFAULT_LOCALE, type Locale } from './messages'
import { resolveText, translate } from './translate'
import { typeLabel } from './typeLabels'

/** Holds the selected interface language. It is UI state only and is not stored. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      text: (text) => resolveText(locale, text),
      finding: (finding) => formatFinding(locale, finding),
      typeLabel: (type) => typeLabel(locale, type),
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
