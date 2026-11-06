import type Modeling from 'bpmn-js/lib/features/modeling/Modeling'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import type { Element } from 'bpmn-js/lib/model/Types'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type { ElementLike } from 'diagram-js/lib/model/Types'
import type Selection from 'diagram-js/lib/features/selection/Selection'

const FOCUS_MARKER = 'validation-focus'

export interface SelectedElement {
  id: string
  type: string
  name: string
}

export interface BpmnEditor {
  importXml(xml: string): Promise<{ warnings: string[] }>
  saveXml(): Promise<string>
  onSelectionChanged(handler: (element: SelectedElement | null) => void): () => void
  onModelChanged(handler: () => void): () => void
  updateName(id: string, name: string): void
  focus(id: string): boolean
  clearFocus(): void
  fit(): void
  resize(): void
  destroy(): void
}

export function createBpmnEditor(container: HTMLElement): BpmnEditor {
  const modeler = new BpmnModeler({ container })
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

  private readonly modeler: BpmnModeler
  private handler: ((element: SelectedElement | null) => void) | null = null
  private selectedId: string | null = null
  private markedId: string | null = null

  constructor(modeler: BpmnModeler) {
    this.modeler = modeler
  }

  async importXml(xml: string): Promise<{ warnings: string[] }> {
    const result = await this.modeler.importXML(xml)
    this.publishSelection()
    return { warnings: (result.warnings ?? []).map(warningText) }
  }

  async saveXml(): Promise<string> {
    const result = await this.modeler.saveXML({ format: true })
    if (!result.xml) throw new Error('The modeler did not return BPMN XML.')
    this.publishSelection()
    return result.xml
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

  updateName(id: string, name: string): void {
    const element = this.registry().get(id)
    if (!element) return
    this.modeling().updateProperties(element as Element, { name })
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
  return {
    id: target.id,
    type: typeof target.type === 'string' ? target.type : 'unknown',
    name: typeof businessName === 'string' ? businessName : '',
  }
}

function warningText(warning: unknown): string {
  if (typeof warning === 'string') return warning
  if (warning && typeof warning === 'object' && 'message' in warning) {
    const message = warning.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'The diagram imported with a warning.'
}
