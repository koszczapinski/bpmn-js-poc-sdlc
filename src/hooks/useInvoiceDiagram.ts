import { useEffect, useRef, useState, type RefObject } from 'react'
import { BpmnParseError, parseBpmnXml } from '../adapters/parseBpmnXml'
import { createBpmnEditor, type BpmnEditor, type SelectedElement } from '../adapters/bpmnEditor'
import { downloadTextFile } from '../adapters/downloadTextFile'
import { INVOICE_APPROVAL_XML, INVOICE_DOWNLOAD_NAME } from '../bpmn/sample'
import { validateProcess } from '../domain/validateProcess'
import type { Finding } from '../domain/types'

export type DiagramPhase = 'loading' | 'ready' | 'error'

export type ValidationState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; findings: Finding[] }
  | { status: 'error'; message: string }

export interface InvoiceDiagram {
  phase: DiagramPhase
  importError: string | null
  warnings: string[]
  selected: SelectedElement | null
  validation: ValidationState
  activeFindingId: string | null
  focusMessage: string | null
  actionError: string | null
  validate: () => Promise<void>
  download: () => Promise<void>
  fit: () => void
  rename: (id: string, name: string) => void
  selectFinding: (finding: Finding) => void
}

export function useInvoiceDiagram(containerRef: RefObject<HTMLDivElement | null>): InvoiceDiagram {
  const editorRef = useRef<BpmnEditor | null>(null)
  const [phase, setPhase] = useState<DiagramPhase>('loading')
  const [importError, setImportError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' })
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null)
  const [focusMessage, setFocusMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = createBpmnEditor(container)
    editorRef.current = editor
    const unsubscribe = editor.onSelectionChanged(setSelected)
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
        setImportError(error instanceof Error ? error.message : 'The diagram could not be opened.')
      })

    return () => {
      cancelled = true
      observer?.disconnect()
      unsubscribe()
      editor.destroy()
      if (editorRef.current === editor) editorRef.current = null
    }
  }, [containerRef])

  async function validate(): Promise<void> {
    const editor = editorRef.current
    if (!editor) {
      setValidation({ status: 'error', message: 'The modeler is not ready.' })
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
      const message =
        error instanceof BpmnParseError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The diagram could not be checked.'
      setValidation({ status: 'error', message })
    }
  }

  async function download(): Promise<void> {
    const editor = editorRef.current
    if (!editor) {
      setActionError('The modeler is not ready.')
      return
    }

    try {
      const xml = await editor.saveXml()
      downloadTextFile(INVOICE_DOWNLOAD_NAME, xml)
      setActionError(null)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'The diagram could not be downloaded.',
      )
    }
  }

  function fit(): void {
    editorRef.current?.fit()
  }

  function rename(id: string, name: string): void {
    editorRef.current?.updateName(id, name)
    setSelected((current) => (current && current.id === id ? { ...current, name } : current))
  }

  function selectFinding(finding: Finding): void {
    setActiveFindingId(finding.id)
    if (!finding.elementId) {
      setFocusMessage(null)
      return
    }
    const found = editorRef.current?.focus(finding.elementId) ?? false
    setFocusMessage(found ? null : `"${finding.elementId}" is not on the current diagram.`)
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
