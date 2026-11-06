import { LOCALES, type Locale } from '../i18n/messages'
import { useI18n } from '../i18n/I18nContext'

const SHORT_NAMES: Record<Locale, string> = { en: 'EN', pl: 'PL' }

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t('language.label')}>
      {LOCALES.map((candidate) => (
        <button
          key={candidate}
          type="button"
          className="lang-option"
          lang={candidate}
          aria-pressed={candidate === locale}
          onClick={() => setLocale(candidate)}
        >
          {SHORT_NAMES[candidate]}
        </button>
      ))}
    </div>
  )
}
