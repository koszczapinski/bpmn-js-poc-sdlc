import { useEffect, useRef, useState, type RefObject } from 'react'
import { parseBpmnXml } from '../adapters/parseBpmnXml'
import { createBpmnEditor, type BpmnEditor, type SelectedElement } from '../adapters/bpmnEditor'
import { downloadTextFile } from '../adapters/downloadTextFile'
import { INVOICE_APPROVAL_XML, INVOICE_DOWNLOAD_NAME } from '../bpmn/sample'
import { validateProcess } from '../domain/validateProcess'
import type { Finding } from '../domain/types'
import type { MessageKey } from '../i18n/messages'
import type { UiText } from '../i18n/translate'

export type DiagramPhase = 'loading' | 'ready' | 'error'

export type ValidationState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; findings: Finding[] }
  | { status: 'error'; message: UiText }

export interface InvoiceDiagram {
  phase: DiagramPhase
  importError: UiText | null
  warnings: string[]
  selected: SelectedElement | null
  validation: ValidationState
  activeFindingId: string | null
  focusMessage: UiText | null
  actionError: UiText | null
  validate: () => Promise<void>
  download: () => Promise<void>
  fit: () => void
  rename: (id: string, name: string) => void
  selectFinding: (finding: Finding) => void
}

/** An error's own message is shown as it is; anything else gets a translated fallback. */
function errorText(error: unknown, fallback: MessageKey): UiText {
  return error instanceof Error && error.message ? { text: error.message } : { key: fallback }
}

export function useInvoiceDiagram(containerRef: RefObject<HTMLDivElement | null>): InvoiceDiagram {
  const editorRef = useRef<BpmnEditor | null>(null)
  const [phase, setPhase] = useState<DiagramPhase>('loading')
  const [importError, setImportError] = useState<UiText | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' })
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null)
  const [focusMessage, setFocusMessage] = useState<UiText | null>(null)
  const [actionError, setActionError] = useState<UiText | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = createBpmnEditor(container)
    editorRef.current = editor
    const unsubscribeSelection = editor.onSelectionChanged(setSelected)
    const unsubscribeModel = editor.onModelChanged(() => {
      setValidation((current) =>
        current.status === 'done' || current.status === 'error' ? { status: 'idle' } : current,
      )
      setActiveFindingId(null)
      setFocusMessage(null)
    })
    let cancelled = false
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => editor.resize())
    observer?.observe(container)

    editor
      .importXml(INVOICE_APPROVAL_XML)
      .then((result) => {
        if (cancelled) return
        setWarnings(result.warnings)
        setPhase('ready')
        editor.fit()
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPhase('error')
        setImportError(errorText(error, 'error.openFailed'))
      })

    return () => {
      cancelled = true
      observer?.disconnect()
      unsubscribeSelection()
      unsubscribeModel()
      editor.destroy()
      if (editorRef.current === editor) editorRef.current = null
    }
  }, [containerRef])

  async function validate(): Promise<void> {
    const editor = editorRef.current
    if (!editor) {
      setValidation({ status: 'error', message: { key: 'error.modelerNotReady' } })
      return
    }

    setValidation({ status: 'running' })
    setActiveFindingId(null)
    setFocusMessage(null)
    editor.clearFocus()

    try {
      const xml = await editor.saveXml()
      const findings = validateProcess(parseBpmnXml(xml))
      setValidation({ status: 'done', findings })
    } catch (error) {
      setValidation({ status: 'error', message: errorText(error, 'error.checkFailed') })
    }
  }

  async function download(): Promise<void> {
    const editor = editorRef.current
    if (!editor) {
      setActionError({ key: 'error.modelerNotReady' })
      return
    }

    try {
      const xml = await editor.saveXml()
      downloadTextFile(INVOICE_DOWNLOAD_NAME, xml)
      setActionError(null)
    } catch (error) {
      setActionError(errorText(error, 'error.downloadFailed'))
    }
  }

  function fit(): void {
    editorRef.current?.fit()
  }

  function rename(id: string, name: string): void {
    editorRef.current?.updateName(id, name)
  }

  function selectFinding(finding: Finding): void {
    setActiveFindingId(finding.id)
    if (!finding.elementId) {
      setFocusMessage(null)
      return
    }
    const found = editorRef.current?.focus(finding.elementId) ?? false
    setFocusMessage(found ? null : { key: 'focus.notOnDiagram', params: { id: finding.elementId } })
  }

  return {
    phase,
    importError,
    warnings,
    selected,
    validation,
    activeFindingId,
    focusMessage,
    actionError,
    validate,
    download,
    fit,
    rename,
    selectFinding,
  }
}
