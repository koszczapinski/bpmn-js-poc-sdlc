import type { Finding } from '../domain/types'
import type { ValidationState } from '../hooks/useInvoiceDiagram'

interface ValidationPanelProps {
  validation: ValidationState
  activeFindingId: string | null
  focusMessage: string | null
  onSelectFinding: (finding: Finding) => void
}

export function ValidationPanel({
  validation,
  activeFindingId,
  focusMessage,
  onSelectFinding,
}: ValidationPanelProps) {
  return (
    <section className="panel" aria-labelledby="validation-heading">
      <h2 id="validation-heading">Structure check</h2>
      <p className="rules">
        Rules: a start event, an end event, incoming and outgoing sequence flows, and exclusive
        gateways with at least two outgoing flows. Not a BPMN 2.0 schema check or a process engine.
      </p>
      <div aria-live="polite">
        {validation.status === 'idle' && <p className="empty">Not checked yet.</p>}
        {validation.status === 'running' && <p className="empty">Checking structure…</p>}
        {validation.status === 'error' && (
          <p className="notice alert" role="alert">
            {validation.message}
          </p>
        )}
        {validation.status === 'done' && validation.findings.length === 0 && (
          <p className="notice ok">No structural issues in this subset.</p>
        )}
        {validation.status === 'done' && validation.findings.length > 0 && (
          <>
            <p className="finding-count">
              {validation.findings.length === 1
                ? '1 structural issue.'
                : `${validation.findings.length} structural issues.`}
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
                    {finding.message}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {focusMessage && <p className="notice alert">{focusMessage}</p>}
      </div>
    </section>
  )
}
