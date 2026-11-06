import type { Finding } from '../domain/types'
import { useI18n } from '../i18n/I18nContext'
import type { ValidationState } from '../hooks/useInvoiceDiagram'
import type { UiText } from '../i18n/translate'

interface ValidationPanelProps {
  validation: ValidationState
  activeFindingId: string | null
  focusMessage: UiText | null
  onSelectFinding: (finding: Finding) => void
}

export function ValidationPanel({
  validation,
  activeFindingId,
  focusMessage,
  onSelectFinding,
}: ValidationPanelProps) {
  const { t, text, finding: findingText } = useI18n()
  return (
    <section className="panel" aria-labelledby="validation-heading">
      <h2 id="validation-heading">{t('check.heading')}</h2>
      <p className="rules">{t('check.rules')}</p>
      <div aria-live="polite">
        {validation.status === 'idle' && <p className="empty">{t('check.idle')}</p>}
        {validation.status === 'running' && <p className="empty">{t('check.running')}</p>}
        {validation.status === 'error' && (
          <p className="notice alert" role="alert">
            {text(validation.message)}
          </p>
        )}
        {validation.status === 'done' && validation.findings.length === 0 && (
          <p className="notice ok">{t('check.ok')}</p>
        )}
        {validation.status === 'done' && validation.findings.length > 0 && (
          <>
            <p className="finding-count">
              {t('check.count', { count: validation.findings.length })}
            </p>
            <ul className="finding-list">
              {validation.findings.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    className="finding"
                    aria-pressed={finding.id === activeFindingId}
                    onClick={() => onSelectFinding(finding)}
                  >
                    {findingText(finding)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {focusMessage && <p className="notice alert">{text(focusMessage)}</p>}
      </div>
    </section>
  )
}
