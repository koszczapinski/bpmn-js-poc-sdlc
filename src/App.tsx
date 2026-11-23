import { useRef, type ChangeEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LanguageSwitch } from './components/LanguageSwitch'
import { ThemeSwitch } from './components/ThemeSwitch'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ValidationPanel } from './components/ValidationPanel'
import { useInvoiceDiagram } from './hooks/useInvoiceDiagram'
import { useI18n } from './i18n/I18nContext'
import { I18nProvider } from './i18n/I18nProvider'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <InvoiceApp />
      </I18nProvider>
    </ThemeProvider>
  )
}

function InvoiceApp() {
  const { t, text } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const diagram = useInvoiceDiagram(containerRef)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ready = diagram.phase === 'ready'

  function onFileChosen(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void diagram.openFile(file)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-col gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="text-[0.68rem] font-medium tracking-widest text-muted-foreground uppercase">
              {t('app.kicker')}
            </p>
            <h1 className="text-xl leading-tight font-semibold tracking-tight">{t('app.title')}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <p className="mr-1 text-xs text-muted-foreground" role="status">
            {diagram.phase === 'loading' && t('status.loading')}
            {diagram.phase === 'ready' && t('status.ready')}
            {diagram.phase === 'error' && t('status.error')}
          </p>
          <LanguageSwitch />
          <ThemeSwitch />
          <input
            ref={fileInputRef}
            type="file"
            accept=".bpmn,.xml,text/xml"
            hidden
            aria-label={t('toolbar.openFileLabel')}
            onChange={onFileChosen}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => void diagram.newDiagram()}
          >
            {t('toolbar.new')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('toolbar.open')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => void diagram.openInvoiceSample()}
          >
            {t('toolbar.invoiceSample')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready || !diagram.history.canUndo}
            onClick={diagram.undo}
          >
            {t('toolbar.undo')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready || !diagram.history.canRedo}
            onClick={diagram.redo}
          >
            {t('toolbar.redo')}
          </Button>
          <Button type="button" variant="outline" disabled={!ready} onClick={diagram.fit}>
            {t('toolbar.fit')}
          </Button>
          <Button
            type="button"
            variant={diagram.isSimulation ? 'default' : 'outline'}
            disabled={!ready}
            onClick={diagram.toggleSimulation}
          >
            {diagram.isSimulation ? t('toolbar.simulationActive') : t('toolbar.simulation')}
          </Button>
          <Button
            type="button"
            disabled={!ready || diagram.validation.status === 'running'}
            onClick={() => void diagram.validate()}
          >
            {diagram.validation.status === 'running'
              ? t('toolbar.checking')
              : t('toolbar.validate')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => void diagram.download()}
          >
            {t('toolbar.download')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            onClick={() => void diagram.downloadSvg()}
          >
            {t('toolbar.exportSvg')}
          </Button>
        </div>
      </header>

      <p className="border-b bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
        {t('app.lede')}
      </p>

      {diagram.importError && (
        <Alert variant="destructive" className="mx-4 mt-3 w-auto">
          <AlertDescription className="text-destructive">
            {text(diagram.importError)}
          </AlertDescription>
        </Alert>
      )}
      {diagram.actionError && (
        <Alert variant="destructive" className="mx-4 mt-3 w-auto">
          <AlertDescription className="text-destructive">
            {text(diagram.actionError)}
          </AlertDescription>
        </Alert>
      )}
      {diagram.warnings.length > 0 && (
        <details className="mx-4 mt-3 rounded-lg border bg-card px-3 py-2.5 text-sm">
          <summary className="cursor-pointer">
            {t('notes.summary', { count: diagram.warnings.length })}
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {diagram.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="workspace">
        <section className="canvas-shell relative" aria-label={t('canvas.label')}>
          <div ref={containerRef} className="canvas-host" />
          {diagram.phase === 'loading' && (
            <div className="overlay">
              <p>{t('status.loading')}</p>
            </div>
          )}
          <div className="absolute right-4 bottom-10 z-10 flex flex-col gap-1 rounded-md border bg-card/95 p-1 shadow-md backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-base leading-none"
              aria-label={t('canvas.zoomIn')}
              title={t('canvas.zoomIn')}
              onClick={diagram.zoomIn}
              disabled={!ready}
            >
              +
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-base leading-none"
              aria-label={t('canvas.zoomOut')}
              title={t('canvas.zoomOut')}
              onClick={diagram.zoomOut}
              disabled={!ready}
            >
              −
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs font-medium"
              aria-label={t('canvas.zoomFit')}
              title={t('canvas.zoomFit')}
              onClick={diagram.fit}
              disabled={!ready}
            >
              Fit
            </Button>
          </div>
          <p className="canvas-caption">{t('canvas.caption')}</p>
        </section>
        <aside className="sidebar">
          <PropertiesPanel
            element={diagram.selected}
            onRename={diagram.rename}
            onUpdateJobType={diagram.updateJobType}
            onUpdateFormId={diagram.updateFormId}
          />
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
