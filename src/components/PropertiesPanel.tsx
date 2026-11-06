import { useState } from 'react'
import { flowNodeLabel } from '../domain/typeLabels'
import type { SelectedElement } from '../adapters/bpmnEditor'

interface PropertiesPanelProps {
  element: SelectedElement | null
  onRename: (id: string, name: string) => void
}

export function PropertiesPanel({ element, onRename }: PropertiesPanelProps) {
  return (
    <section className="panel" aria-labelledby="selection-heading">
      <h2 id="selection-heading">Selection</h2>
      {element ? (
        <>
          <dl className="meta">
            <dt>Id</dt>
            <dd>
              <code>{element.id}</code>
            </dd>
            <dt>Type</dt>
            <dd>{flowNodeLabel(element.type)}</dd>
          </dl>
          <NameField key={`${element.id}:${element.name}`} element={element} onRename={onRename} />
        </>
      ) : (
        <p className="empty">Select a shape or flow. This panel shows its id, type, and name.</p>
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
  const [draft, setDraft] = useState(element.name)

  function commit() {
    const next = draft.trim()
    if (next === element.name) return
    onRename(element.id, next)
  }

  return (
    <label className="field">
      Name
      <input
        value={draft}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <span className="hint">Applied to the BPMN element when you leave the field.</span>
    </label>
  )
}
