import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
    <section aria-labelledby="validation-heading">
      <Card className="gap-3 rounded-none border-0 border-b py-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <h2 id="validation-heading" className="text-base font-semibold tracking-tight">
              {t('check.heading')}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t('check.rules')}</p>
          <div aria-live="polite" className="flex flex-col gap-3">
            {validation.status === 'idle' && (
              <p className="text-sm text-muted-foreground">{t('check.idle')}</p>
            )}
            {validation.status === 'running' && (
              <p className="text-sm text-muted-foreground">{t('check.running')}</p>
            )}
            {validation.status === 'error' && (
              <Alert variant="destructive">
                <AlertDescription className="text-destructive">
                  {text(validation.message)}
                </AlertDescription>
              </Alert>
            )}
            {validation.status === 'done' && validation.findings.length === 0 && (
              <Alert
                role={undefined}
                className="border-primary/40 bg-accent text-accent-foreground"
              >
                <AlertDescription className="text-accent-foreground">
                  {t('check.ok')}
                </AlertDescription>
              </Alert>
            )}
            {validation.status === 'done' && validation.findings.length > 0 && (
              <>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" aria-hidden="true">
                    {validation.findings.length}
                  </Badge>
                  {t('check.count', { count: validation.findings.length })}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {validation.findings.map((finding) => (
                    <li key={finding.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-auto w-full justify-start px-2.5 py-2 text-left font-normal whitespace-normal',
                          finding.id === activeFindingId && 'border-primary bg-accent',
                        )}
                        aria-pressed={finding.id === activeFindingId}
                        onClick={() => onSelectFinding(finding)}
                      >
                        {findingText(finding)}
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {focusMessage && (
              <Alert variant="destructive" role={undefined}>
                <AlertDescription className="text-destructive">
                  {text(focusMessage)}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
