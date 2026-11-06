import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SelectedElement } from '../adapters/bpmnEditor'
import { useI18n } from '../i18n/I18nContext'

interface PropertiesPanelProps {
  element: SelectedElement | null
  onRename: (id: string, name: string) => void
}

export function PropertiesPanel({ element, onRename }: PropertiesPanelProps) {
  const { t, typeLabel } = useI18n()
  return (
    <section aria-labelledby="selection-heading">
      <Card className="gap-3 rounded-none border-0 border-b py-4 shadow-none">
        <CardHeader>
          <CardTitle>
            <h2 id="selection-heading" className="text-base font-semibold tracking-tight">
              {t('selection.heading')}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {element ? (
            <>
              <dl className="mb-4 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1.5">
                <dt className="pt-0.5 text-[0.68rem] font-medium tracking-wider text-muted-foreground uppercase">
                  {t('selection.id')}
                </dt>
                <dd>
                  <code>{element.id}</code>
                </dd>
                <dt className="pt-0.5 text-[0.68rem] font-medium tracking-wider text-muted-foreground uppercase">
                  {t('selection.type')}
                </dt>
                <dd>{typeLabel(element.type)}</dd>
              </dl>
              <NameField
                key={`${element.id}:${element.name}`}
                element={element}
                onRename={onRename}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('selection.empty')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function NameField({
  element,
  onRename,
}: {
  element: SelectedElement
  onRename: (id: string, name: string) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(element.name)

  function commit() {
    const next = draft.trim()
    if (next === element.name) return
    onRename(element.id, next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[0.68rem] tracking-wider text-muted-foreground uppercase">
        {t('selection.name')}
        <Input
          className="mt-1.5 text-sm tracking-normal text-foreground normal-case"
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </Label>
      <span className="text-sm text-muted-foreground">{t('selection.hint')}</span>
    </div>
  )
}
