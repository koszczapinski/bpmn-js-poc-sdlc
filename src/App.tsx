import { useRef } from 'react'
import { LanguageSwitch } from './components/LanguageSwitch'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ValidationPanel } from './components/ValidationPanel'
import { useInvoiceDiagram } from './hooks/useInvoiceDiagram'
import { useI18n } from './i18n/I18nContext'
import { I18nProvider } from './i18n/I18nProvider'

export default function App() {
  return (
    <I18nProvider>
      <InvoiceApp />
    </I18nProvider>
  )
}

function InvoiceApp() {
  const { t, text } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const diagram = useInvoiceDiagram(containerRef)
  const ready = diagram.phase === 'ready'

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="kicker">{t('app.kicker')}</p>
            <h1>{t('app.title')}</h1>
          </div>
        </div>
        <div className="toolbar">
          <p className="status" role="status">
            {diagram.phase === 'loading' && t('status.loading')}
            {diagram.phase === 'ready' && t('status.ready')}
            {diagram.phase === 'error' && t('status.error')}
          </p>
          <LanguageSwitch />
          <button
            type="button"
            className="button"
            disabled={!ready || !diagram.history.canUndo}
            onClick={diagram.undo}
          >
            {t('toolbar.undo')}
          </button>
          <button
            type="button"
            className="button"
            disabled={!ready || !diagram.history.canRedo}
            onClick={diagram.redo}
          >
            {t('toolbar.redo')}
          </button>
          <button type="button" className="button" disabled={!ready} onClick={diagram.fit}>
            {t('toolbar.fit')}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!ready || diagram.validation.status === 'running'}
            onClick={() => void diagram.validate()}
          >
            {diagram.validation.status === 'running'
              ? t('toolbar.checking')
              : t('toolbar.validate')}
          </button>
          <button
            type="button"
            className="button"
            disabled={!ready}
            onClick={() => void diagram.download()}
          >
            {t('toolbar.download')}
          </button>
        </div>
      </header>

      <p className="lede">{t('app.lede')}</p>

      {diagram.importError && (
        <p className="banner alert" role="alert">
          {text(diagram.importError)}
        </p>
      )}
      {diagram.actionError && (
        <p className="banner alert" role="alert">
          {text(diagram.actionError)}
        </p>
      )}
      {diagram.warnings.length > 0 && (
        <details className="banner notes">
          <summary>{t('notes.summary', { count: diagram.warnings.length })}</summary>
          <ul>
            {diagram.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="workspace">
        <section className="canvas-shell" aria-label={t('canvas.label')}>
          <div ref={containerRef} className="canvas-host" />
          {diagram.phase === 'loading' && (
            <div className="overlay">
              <p>{t('status.loading')}</p>
            </div>
          )}
          <p className="canvas-caption">{t('canvas.caption')}</p>
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
