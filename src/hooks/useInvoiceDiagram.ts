import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { assertImportableFlowchart, parseBpmnXml } from '../adapters/parseBpmnXml'
import {
  createBpmnEditor,
  type BpmnEditor,
  type EditorHistory,
  type SelectedElement,
} from '../adapters/bpmnEditor'
import { downloadTextFile } from '../adapters/downloadTextFile'
import {
  BLANK_PROCESS_XML,
  INVOICE_APPROVAL_XML,
  INVOICE_DOWNLOAD_NAME,
  xmlForPreparedPrompt,
} from '../bpmn/sample'
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
  history: EditorHistory
  activeFindingId: string | null
  focusMessage: UiText | null
  actionError: UiText | null
  isSimulation: boolean
  /** The open diagram is one process with no flow nodes and no sequence flows. */
  isBlank: boolean
  promptDraft: string
  setPromptDraft: (value: string) => void
  generateDiagram: () => Promise<void>
  validate: () => Promise<void>
  download: () => Promise<void>
  downloadSvg: () => Promise<void>
  openFile: (file: File) => Promise<void>
  newDiagram: () => Promise<void>
  openInvoiceSample: () => Promise<void>
  fit: () => void
  zoomIn: () => void
  zoomOut: () => void
  toggleSimulation: () => void
  undo: () => void
  redo: () => void
  rename: (id: string, name: string) => void
  updateJobType: (id: string, jobType: string) => void
  updateFormId: (id: string, formId: string) => void
  selectFinding: (finding: Finding) => void
}

/** An error's own message is shown as it is; anything else gets a translated fallback. */
function errorText(error: unknown, fallback: MessageKey): UiText {
  return error instanceof Error && error.message ? { text: error.message } : { key: fallback }
}

const NO_HISTORY: EditorHistory = { canUndo: false, canRedo: false }

export function useInvoiceDiagram(containerRef: RefObject<HTMLDivElement | null>): InvoiceDiagram {
  const editorRef = useRef<BpmnEditor | null>(null)
  const [phase, setPhase] = useState<DiagramPhase>('loading')
  const [importError, setImportError] = useState<UiText | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' })
  const [history, setHistory] = useState<EditorHistory>(NO_HISTORY)
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null)
  const [focusMessage, setFocusMessage] = useState<UiText | null>(null)
  const [actionError, setActionError] = useState<UiText | null>(null)
  const [isSimulation, setIsSimulation] = useState<boolean>(false)
  const [isBlank, setIsBlank] = useState(false)
  const [promptDraft, setPromptDraft] = useState('')
  const refreshBlankRef = useRef<() => void>(() => {})

  const refreshBlankness = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    setIsBlank(editor.isBlank())
  }, [])

  useEffect(() => {
    refreshBlankRef.current = () => {
      void refreshBlankness()
    }
  }, [refreshBlankness])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = createBpmnEditor(container)
    editorRef.current = editor
    const unsubscribeSelection = editor.onSelectionChanged(setSelected)
    const unsubscribeSimulation = editor.onSimulationToggled((active) => {
      setIsSimulation(active)
    })
    const unsubscribeModel = editor.onModelChanged(() => {
      setHistory(editor.history())
      setValidation((current) =>
        current.status === 'done' || current.status === 'error' ? { status: 'idle' } : current,
      )
      setActiveFindingId(null)
      setFocusMessage(null)
      refreshBlankRef.current()
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
        setHistory(editor.history())
        setPhase('ready')
        editor.fit()
        refreshBlankRef.current()
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
      unsubscribeSimulation()
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

  async function downloadSvg(): Promise<void> {
    const editor = editorRef.current
    if (!editor) {
      setActionError({ key: 'error.modelerNotReady' })
      return
    }

    try {
      const svg = await editor.saveSvg()
      downloadTextFile('invoice-approval.svg', svg, 'image/svg+xml;charset=utf-8')
      setActionError(null)
    } catch (error) {
      setActionError(errorText(error, 'error.downloadSvgFailed'))
    }
  }

  async function replaceDiagram(xml: string): Promise<boolean> {
    const editor = editorRef.current
    if (!editor) {
      setActionError({ key: 'error.modelerNotReady' })
      return false
    }

    try {
      const result = await editor.replaceXml(xml)
      editor.clearFocus()
      editor.fit()
      setWarnings(result.warnings)
      setValidation({ status: 'idle' })
      setActiveFindingId(null)
      setFocusMessage(null)
      setActionError(null)
      setPromptDraft('')
      setIsBlank(editor.isBlank())
      return true
    } catch (error) {
      setActionError(errorText(error, 'error.openFileFailed'))
      return false
    } finally {
      setHistory(editor.history())
    }
  }

  async function openFile(file: File): Promise<void> {
    if (!editorRef.current) {
      setActionError({ key: 'error.modelerNotReady' })
      return
    }

    let xml: string
    try {
      xml = await file.text()
    } catch (error) {
      setActionError(errorText(error, 'error.openFileFailed'))
      return
    }

    await replaceDiagram(xml)
  }

  async function newDiagram(): Promise<void> {
    await replaceDiagram(BLANK_PROCESS_XML)
  }

  async function openInvoiceSample(): Promise<void> {
    await replaceDiagram(INVOICE_APPROVAL_XML)
  }

  async function generateDiagram(): Promise<void> {
    if (promptDraft.trim() === '') return
    const xml = xmlForPreparedPrompt(promptDraft)
    if (!xml) {
      setActionError({ key: 'error.noLiveLanguageModel' })
      return
    }
    try {
      assertImportableFlowchart(xml)
    } catch (error) {
      setActionError(errorText(error, 'error.openFileFailed'))
      return
    }
    await replaceDiagram(xml)
  }

  function fit(): void {
    editorRef.current?.fit()
  }

  function zoomIn(): void {
    editorRef.current?.zoomIn()
  }

  function zoomOut(): void {
    editorRef.current?.zoomOut()
  }

  function toggleSimulation(): void {
    if (!editorRef.current) return
    const next = editorRef.current.toggleSimulation()
    setIsSimulation(next)
  }

  function undo(): void {
    editorRef.current?.undo()
  }

  function redo(): void {
    editorRef.current?.redo()
  }

  function rename(id: string, name: string): void {
    editorRef.current?.updateName(id, name)
  }

  function updateJobType(id: string, jobType: string): void {
    editorRef.current?.updateJobType(id, jobType)
  }

  function updateFormId(id: string, formId: string): void {
    editorRef.current?.updateFormId(id, formId)
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
    history,
    activeFindingId,
    focusMessage,
    actionError,
    isSimulation,
    isBlank,
    promptDraft,
    setPromptDraft,
    generateDiagram,
    validate,
    download,
    downloadSvg,
    openFile,
    newDiagram,
    openInvoiceSample,
    fit,
    zoomIn,
    zoomOut,
    toggleSimulation,
    undo,
    redo,
    rename,
    updateJobType,
    updateFormId,
    selectFinding,
  }
}
