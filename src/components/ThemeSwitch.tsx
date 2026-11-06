import { Moon, Sun, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import type { MessageKey } from '../i18n/messages'
import { THEMES, useTheme, type Theme } from '../theme/ThemeContext'

const OPTIONS: Record<Theme, { icon: LucideIcon; label: MessageKey }> = {
  light: { icon: Sun, label: 'theme.light' },
  dark: { icon: Moon, label: 'theme.dark' },
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  return (
    <div
      className="inline-flex gap-0.5 rounded-md border bg-card p-0.5"
      role="group"
      aria-label={t('theme.label')}
    >
      {THEMES.map((candidate) => {
        const { icon: Icon, label } = OPTIONS[candidate]
        const selected = candidate === theme
        return (
          <Button
            key={candidate}
            type="button"
            size="icon-sm"
            variant={selected ? 'default' : 'ghost'}
            className={cn(!selected && 'text-muted-foreground')}
            aria-label={t(label)}
            aria-pressed={selected}
            onClick={() => setTheme(candidate)}
          >
            <Icon aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}
