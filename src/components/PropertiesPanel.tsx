import { useState } from 'react'
import type { SelectedElement } from '../adapters/bpmnEditor'
import { useI18n } from '../i18n/I18nContext'

interface PropertiesPanelProps {
  element: SelectedElement | null
  onRename: (id: string, name: string) => void
}

export function PropertiesPanel({ element, onRename }: PropertiesPanelProps) {
  const { t, typeLabel } = useI18n()
  return (
    <section className="panel" aria-labelledby="selection-heading">
      <h2 id="selection-heading">{t('selection.heading')}</h2>
      {element ? (
        <>
          <dl className="meta">
            <dt>{t('selection.id')}</dt>
            <dd>
              <code>{element.id}</code>
            </dd>
            <dt>{t('selection.type')}</dt>
            <dd>{typeLabel(element.type)}</dd>
          </dl>
          <NameField key={`${element.id}:${element.name}`} element={element} onRename={onRename} />
        </>
      ) : (
        <p className="empty">{t('selection.empty')}</p>
      )}
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
    <label className="field">
      {t('selection.name')}
      <input
        value={draft}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <span className="hint">{t('selection.hint')}</span>
    </label>
  )
}
