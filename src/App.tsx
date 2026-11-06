import { useRef } from 'react'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ValidationPanel } from './components/ValidationPanel'
import { useInvoiceDiagram } from './hooks/useInvoiceDiagram'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const diagram = useInvoiceDiagram(containerRef)
  const ready = diagram.phase === 'ready'

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="kicker">BPMN.js proof of concept</p>
            <h1>Invoice approval</h1>
          </div>
        </div>
        <div className="toolbar">
          <p className="status" role="status">
            {diagram.phase === 'loading' && 'Opening the invoice diagram…'}
            {diagram.phase === 'ready' && 'Diagram ready'}
            {diagram.phase === 'error' && 'The diagram could not be opened'}
          </p>
          <button type="button" className="button" disabled={!ready} onClick={diagram.fit}>
            Fit
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!ready || diagram.validation.status === 'running'}
            onClick={() => void diagram.validate()}
          >
            {diagram.validation.status === 'running' ? 'Checking…' : 'Validate'}
          </button>
          <button
            type="button"
            className="button"
            disabled={!ready}
            onClick={() => void diagram.download()}
          >
            Download BPMN
          </button>
        </div>
      </header>

      <p className="lede">
        A clerk checks an incoming invoice. Invalid invoices loop through a clarification request.
        Valid ones split on amount: up to 1,000 PLN is approved automatically, and anything higher
        waits for a manager. The invoice is then archived.
      </p>

      {diagram.importError && (
        <p className="banner alert" role="alert">
          {diagram.importError}
        </p>
      )}
      {diagram.actionError && (
        <p className="banner alert" role="alert">
          {diagram.actionError}
        </p>
      )}
      {diagram.warnings.length > 0 && (
        <details className="banner notes">
          <summary>Import notes ({diagram.warnings.length})</summary>
          <ul>
            {diagram.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="workspace">
        <section className="canvas-shell" aria-label="Diagram canvas">
          <div ref={containerRef} className="canvas-host" />
          {diagram.phase === 'loading' && (
            <div className="overlay">
              <p>Opening the invoice diagram…</p>
            </div>
          )}
          <p className="canvas-caption">
            Drag to pan · scroll to zoom · click a shape · Delete removes it
          </p>
        </section>
        <aside className="sidebar">
          <PropertiesPanel element={diagram.selected} onRename={diagram.rename} />
          <ValidationPanel
            validation={diagram.validation}
            activeFindingId={diagram.activeFindingId}
            focusMessage={diagram.focusMessage}
            onSelectFinding={diagram.selectFinding}
          />
        </aside>
      </div>
    </div>
  )
}
