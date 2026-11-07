import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LOCALES, type Locale } from '../i18n/messages'
import { useI18n } from '../i18n/I18nContext'

const SHORT_NAMES: Record<Locale, string> = { en: 'EN', pl: 'PL' }

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div
      className="inline-flex gap-0.5 rounded-md border bg-card p-0.5"
      role="group"
      aria-label={t('language.label')}
    >
      {LOCALES.map((candidate) => {
        const selected = candidate === locale
        return (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'ghost'}
            className={cn('font-semibold tracking-wide', !selected && 'text-muted-foreground')}
            lang={candidate}
            aria-pressed={selected}
            onClick={() => setLocale(candidate)}
          >
            {SHORT_NAMES[candidate]}
          </Button>
        )
      })}
    </div>
  )
}
