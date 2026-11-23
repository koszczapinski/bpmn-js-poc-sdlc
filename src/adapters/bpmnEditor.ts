import type Modeling from 'bpmn-js/lib/features/modeling/Modeling'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import type { Element } from 'bpmn-js/lib/model/Types'
import type CommandStack from 'diagram-js/lib/command/CommandStack'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type { ElementLike } from 'diagram-js/lib/model/Types'
import type Selection from 'diagram-js/lib/features/selection/Selection'
import lintModule from 'bpmn-js-bpmnlint'
import tokenSimulationModule from 'bpmn-js-token-simulation'
import minimapModule from 'diagram-js-minimap/dist/index.esm.js'
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json'
import { isFlowNodeType } from '../domain/flowNodes'

const FOCUS_MARKER = 'validation-focus'

export interface SelectedElement {
  id: string
  type: string
  name: string
  jobType?: string
  formId?: string
}

export interface EditorHistory {
  canUndo: boolean
  canRedo: boolean
}

export interface BpmnEditor {
  importXml(xml: string): Promise<{ warnings: string[] }>
  /** Replaces the diagram. If the modeler rejects the XML, the previous diagram is put back. */
  replaceXml(xml: string): Promise<{ warnings: string[] }>
  saveXml(): Promise<string>
  saveSvg(): Promise<string>
  /** Exactly one process, with no flow nodes and no sequence flows. */
  isBlank(): boolean
  onSelectionChanged(handler: (element: SelectedElement | null) => void): () => void
  onModelChanged(handler: () => void): () => void
  onSimulationToggled(handler: (active: boolean) => void): () => void
  updateName(id: string, name: string): void
  updateJobType(id: string, jobType: string): void
  updateFormId(id: string, formId: string): void
  history(): EditorHistory
  undo(): void
  redo(): void
  toggleSimulation(active?: boolean): boolean
  isSimulationActive(): boolean
  zoomIn(): void
  zoomOut(): void
  zoomFit(): void
  focus(id: string): boolean
  clearFocus(): void
  fit(): void
  resize(): void
  destroy(): void
}

interface ModdleElement {
  $type: string
  $parent?: ModdleElement
  [key: string]: unknown
}

interface ExtensionElements extends ModdleElement {
  values?: ModdleElement[]
  get?: (property: string) => ModdleElement[]
}

interface TaskDefinition extends ModdleElement {
  type?: string
}

interface FormDefinition extends ModdleElement {
  formId?: string
  formKey?: string
}

interface ElementBusinessObject extends ModdleElement {
  name?: string
  extensionElements?: ExtensionElements
}

interface BpmnFactory {
  create(type: string, properties?: Record<string, unknown>): ModdleElement
}

interface ModdleModeling extends Modeling {
  updateModdleProperties(
    element: Element,
    moddleElement: ModdleElement,
    properties: Record<string, unknown>,
  ): void
}

interface LintReporter {
  report(id: string, message: string): void
}

interface ToggleModeService {
  toggleMode(active?: boolean): void
  _active?: boolean
}

function zeebeServiceTaskRule() {
  function check(node: ModdleElement, reporter: LintReporter) {
    if (node.$type === 'bpmn:ServiceTask') {
      const extElements = node.extensionElements as ExtensionElements | undefined
      const values = extElements?.values || []
      const taskDef = values.find((val) => val.$type === 'zeebe:TaskDefinition') as
        TaskDefinition | undefined
      if (!taskDef || !taskDef.type || !taskDef.type.trim()) {
        reporter.report(String(node.id ?? ''), 'Service Task requires a Zeebe job type')
      }
    }
  }
  return { check }
}

const bpmnlintConfig = {
  config: {
    rules: {
      'camunda/zeebe-service-task-definition': 'error',
    },
  },
  resolver: {
    resolveRule(_pkg: string, name: string) {
      if (name === 'camunda/zeebe-service-task-definition') {
        return zeebeServiceTaskRule
      }
      return null
    },
  },
}

export function createBpmnEditor(container: HTMLElement): BpmnEditor {
  const modeler = new BpmnModeler({
    container,
    moddleExtensions: {
      zeebe: zeebeModdle,
    },
    linting: {
      bpmnlint: bpmnlintConfig,
      active: true,
    },
    additionalModules: [lintModule, tokenSimulationModule, minimapModule],
  })
  return new BpmnJsEditor(modeler)
}

class BpmnJsEditor implements BpmnEditor {
  private readonly onSelection = (event: { newSelection?: ElementLike[] }) => {
    const selected = event.newSelection?.[0]
    this.handler?.(readElement(selected))
  }

  private readonly onElementChanged = (event: { element?: ElementLike }) => {
    const element = readElement(event.element)
    if (!element || element.id !== this.selectedId) return
    this.handler?.(element)
  }

  private readonly onCommandStackChanged = () => {
    this.publishSelection()
  }

  private readonly onToggleMode = (event: { active?: boolean }) => {
    const active = Boolean(event.active)
    this.simulationHandler?.(active)
  }

  private readonly modeler: BpmnModeler
  private handler: ((element: SelectedElement | null) => void) | null = null
  private simulationHandler: ((active: boolean) => void) | null = null
  private selectedId: string | null = null
  private markedId: string | null = null

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler
  }

  async importXml(xml: string): Promise<{ warnings: string[] }> {
    const result = await this.modeler.importXML(xml)
    this.publishSelection()
    // The token-simulation module turns the mode back on at import.done when it was on.
    if (this.isSimulationActive()) this.toggleSimulation(false)
    return { warnings: (result.warnings ?? []).map(warningText) }
  }

  async replaceXml(xml: string): Promise<{ warnings: string[] }> {
    const previous = await this.saveXml()
    try {
      return await this.importXml(xml)
    } catch (error) {
      try {
        // Direct import, not importXml: a failed open must not end token simulation.
        await this.modeler.importXML(previous)
      } catch {
        // Report the file's error, not the failed restore.
      }
      this.publishSelection()
      throw error
    }
  }

  async saveXml(): Promise<string> {
    const result = await this.modeler.saveXML({ format: true })
    if (!result.xml) throw new Error('The modeler did not return BPMN XML.')
    this.publishSelection()
    return result.xml
  }

  async saveSvg(): Promise<string> {
    const result = await this.modeler.saveSVG()
    if (!result.svg) throw new Error('The modeler did not return SVG.')
    return result.svg
  }

  isBlank(): boolean {
    const definitions = this.modeler.getDefinitions() as DiagramDefinitions | undefined
    const processes = (definitions?.rootElements ?? []).filter(
      (element) => element.$type === 'bpmn:Process',
    )
    if (processes.length !== 1) return false
    const flowElements = processes[0]?.flowElements ?? []
    return !Array.from(flowElements).some((element) => hasFlowContent(element.$type))
  }

  onSelectionChanged(handler: (element: SelectedElement | null) => void): () => void {
    this.handler = (element) => {
      this.selectedId = element?.id ?? null
      handler(element)
    }
    this.modeler.on('selection.changed', this.onSelection)
    this.modeler.on('element.changed', this.onElementChanged)
    this.modeler.on('commandStack.changed', this.onCommandStackChanged)
    return () => {
      this.modeler.off('selection.changed', this.onSelection)
      this.modeler.off('element.changed', this.onElementChanged)
      this.modeler.off('commandStack.changed', this.onCommandStackChanged)
      this.handler = null
    }
  }

  onModelChanged(handler: () => void): () => void {
    const listener = () => handler()
    this.modeler.on('commandStack.changed', listener)
    return () => this.modeler.off('commandStack.changed', listener)
  }

  onSimulationToggled(handler: (active: boolean) => void): () => void {
    this.simulationHandler = handler
    this.modeler.on('tokenSimulation.toggleMode', this.onToggleMode)
    return () => {
      this.modeler.off('tokenSimulation.toggleMode', this.onToggleMode)
      this.simulationHandler = null
    }
  }

  updateName(id: string, name: string): void {
    const element = this.registry().get(id)
    if (!element) return
    this.modeling().updateProperties(element as Element, { name })
  }

  updateJobType(id: string, jobType: string): void {
    const element = this.registry().get(id) as Element | undefined
    if (!element || element.type !== 'bpmn:ServiceTask') return

    const modeling = this.modeling() as unknown as ModdleModeling
    const bpmnFactory = this.modeler.get<BpmnFactory>('bpmnFactory')
    const bo = element.businessObject as ElementBusinessObject
    let extensionElements = bo.extensionElements

    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: [],
      }) as ExtensionElements
      extensionElements.$parent = bo
      modeling.updateModdleProperties(element, bo, { extensionElements })
    }

    const values = (
      extensionElements.get ? extensionElements.get('values') : extensionElements.values || []
    ) as ModdleElement[]
    const cleanJobType = jobType.trim()
    const existing = values.find((val) => val.$type === 'zeebe:TaskDefinition') as
      TaskDefinition | undefined

    if (existing) {
      if (cleanJobType) {
        modeling.updateModdleProperties(element, existing, { type: cleanJobType })
      } else {
        const nextValues = values.filter((val) => val !== existing)
        modeling.updateModdleProperties(element, extensionElements, { values: nextValues })
      }
    } else if (cleanJobType) {
      const taskDef = bpmnFactory.create('zeebe:TaskDefinition', {
        type: cleanJobType,
      }) as TaskDefinition
      taskDef.$parent = extensionElements
      const nextValues = [...values, taskDef]
      modeling.updateModdleProperties(element, extensionElements, { values: nextValues })
    }
  }

  updateFormId(id: string, formId: string): void {
    const element = this.registry().get(id) as Element | undefined
    if (!element || element.type !== 'bpmn:UserTask') return

    const modeling = this.modeling() as unknown as ModdleModeling
    const bpmnFactory = this.modeler.get<BpmnFactory>('bpmnFactory')
    const bo = element.businessObject as ElementBusinessObject
    let extensionElements = bo.extensionElements

    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: [],
      }) as ExtensionElements
      extensionElements.$parent = bo
      modeling.updateModdleProperties(element, bo, { extensionElements })
    }

    const values = (
      extensionElements.get ? extensionElements.get('values') : extensionElements.values || []
    ) as ModdleElement[]
    const cleanFormId = formId.trim()
    const existing = values.find((val) => val.$type === 'zeebe:FormDefinition') as
      FormDefinition | undefined

    if (existing) {
      if (cleanFormId) {
        modeling.updateModdleProperties(element, existing, { formId: cleanFormId })
      } else {
        const nextValues = values.filter((val) => val !== existing)
        modeling.updateModdleProperties(element, extensionElements, { values: nextValues })
      }
    } else if (cleanFormId) {
      const formDef = bpmnFactory.create('zeebe:FormDefinition', {
        formId: cleanFormId,
      }) as FormDefinition
      formDef.$parent = extensionElements
      const nextValues = [...values, formDef]
      modeling.updateModdleProperties(element, extensionElements, { values: nextValues })
    }
  }

  history(): EditorHistory {
    const stack = this.commandStack()
    return { canUndo: stack.canUndo(), canRedo: stack.canRedo() }
  }

  undo(): void {
    this.commandStack().undo()
  }

  redo(): void {
    this.commandStack().redo()
  }

  toggleSimulation(active?: boolean): boolean {
    try {
      const toggleMode = this.modeler.get<ToggleModeService>('toggleMode')
      if (toggleMode) {
        toggleMode.toggleMode(active)
        return Boolean(toggleMode._active)
      }
    } catch {
      // module not present or inactive
    }
    return false
  }

  isSimulationActive(): boolean {
    try {
      const toggleMode = this.modeler.get<ToggleModeService>('toggleMode')
      return Boolean(toggleMode?._active)
    } catch {
      return false
    }
  }

  zoomIn(): void {
    const canvas = this.canvas()
    const current = typeof canvas.zoom() === 'number' ? (canvas.zoom() as number) : 1
    canvas.zoom(Math.min(current * 1.25, 4))
  }

  zoomOut(): void {
    const canvas = this.canvas()
    const current = typeof canvas.zoom() === 'number' ? (canvas.zoom() as number) : 1
    canvas.zoom(Math.max(current * 0.8, 0.2))
  }

  zoomFit(): void {
    this.fit()
  }

  focus(id: string): boolean {
    this.clearFocus()
    const element = this.registry().get(id)
    if (!element) return false
    this.canvas().addMarker(id, FOCUS_MARKER)
    this.markedId = id
    this.selection().select(element)
    this.canvas().scrollToElement(id, 80)
    return true
  }

  clearFocus(): void {
    if (!this.markedId) return
    try {
      this.canvas().removeMarker(this.markedId, FOCUS_MARKER)
    } catch {
      // The shape may already have been deleted from the canvas.
    }
    this.markedId = null
  }

  fit(): void {
    const canvas = this.canvas()
    canvas.zoom('fit-viewport')
    const box = canvas.viewbox()
    if (!box.inner?.width || !box.inner.height) return

    const leftGutter = 96
    const padding = 28
    canvas.viewbox({
      x: box.inner.x - leftGutter,
      y: box.inner.y - padding,
      width: box.inner.width + leftGutter + padding,
      height: box.inner.height + padding * 2,
    })
  }

  resize(): void {
    this.canvas().resized()
  }

  destroy(): void {
    this.modeler.destroy()
  }

  private canvas(): Canvas {
    return this.modeler.get<Canvas>('canvas')
  }

  private selection(): Selection {
    return this.modeler.get<Selection>('selection')
  }

  private registry(): ElementRegistry {
    return this.modeler.get<ElementRegistry>('elementRegistry')
  }

  private commandStack(): CommandStack {
    return this.modeler.get<CommandStack>('commandStack')
  }

  private modeling(): Modeling {
    return this.modeler.get<Modeling>('modeling')
  }

  private publishSelection(): void {
    if (!this.handler) return
    const selected = this.selection().get()
    this.handler(readElement(selected[0]))
  }
}

function readElement(element: ElementLike | undefined): SelectedElement | null {
  if (!element) return null
  const target =
    element.type === 'label' && element.labelTarget ? (element.labelTarget as ElementLike) : element
  if (!target.id || target.type === 'bpmn:Process') return null
  const businessName = target.businessObject?.name
  const bo = target.businessObject as ElementBusinessObject | undefined
  let jobType: string | undefined
  let formId: string | undefined

  if (bo?.extensionElements?.values) {
    const values = bo.extensionElements.values
    if (target.type === 'bpmn:ServiceTask') {
      const taskDef = values.find((val) => val.$type === 'zeebe:TaskDefinition') as
        TaskDefinition | undefined
      if (taskDef && typeof taskDef.type === 'string') {
        jobType = taskDef.type
      }
    } else if (target.type === 'bpmn:UserTask') {
      const formDef = values.find((val) => val.$type === 'zeebe:FormDefinition') as
        FormDefinition | undefined
      if (formDef && typeof (formDef.formId || formDef.formKey) === 'string') {
        formId = (formDef.formId || formDef.formKey) as string
      }
    }
  }

  return {
    id: target.id,
    type: typeof target.type === 'string' ? target.type : 'unknown',
    name: typeof businessName === 'string' ? businessName : '',
    jobType,
    formId,
  }
}

interface DiagramDefinitions {
  rootElements?: Array<{
    $type?: string
    flowElements?: Array<{ $type?: string }>
  }>
}

function hasFlowContent(type: string | undefined): boolean {
  if (!type) return false
  const name = type.includes(':') ? type.slice(type.lastIndexOf(':') + 1) : type
  const local = `${name.charAt(0).toLowerCase()}${name.slice(1)}`
  return local === 'sequenceFlow' || isFlowNodeType(local)
}

function warningText(warning: unknown): string {
  if (typeof warning === 'string') return warning
  if (warning && typeof warning === 'object' && 'message' in warning) {
    const message = warning.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'The diagram imported with a warning.'
}
