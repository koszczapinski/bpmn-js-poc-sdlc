import { isFlowNodeType } from '../domain/flowNodes'
import type { BpmnProcessModel, FlowNode, SequenceFlow } from '../domain/types'

/**
 * Turns BPMN XML into the small process model the validator understands.
 * It reads the first process only, and only that process's direct children.
 * Nested sub-process contents are ignored. This is not a schema validator.
 */
export class BpmnParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BpmnParseError'
  }
}

export function parseBpmnXml(xml: string): BpmnProcessModel {
  if (typeof xml !== 'string' || xml.trim() === '') {
    throw new BpmnParseError('The BPMN XML is empty.')
  }

  const document = parseDocument(xml)
  const process = findFirstProcess(document)
  const processId = requiredAttribute(process, 'id', 'The BPMN process is missing an id.')
  const nodes: FlowNode[] = []
  const flows: SequenceFlow[] = []
  const seenIds = new Set<string>([processId])

  for (const child of Array.from(process.children)) {
    const localName = child.localName
    if (localName === 'sequenceFlow') {
      flows.push(readSequenceFlow(child, seenIds))
      continue
    }
    if (!isFlowNodeType(localName)) continue
    nodes.push(readFlowNode(child, localName, seenIds))
  }

  return {
    id: processId,
    name: optionalName(process.getAttribute('name')),
    nodes,
    flows,
  }
}

function parseDocument(xml: string): Document {
  let document: Document
  try {
    document = new DOMParser().parseFromString(xml, 'application/xml')
  } catch {
    throw new BpmnParseError('The BPMN XML could not be parsed.')
  }

  if (!document.documentElement || hasParserError(document)) {
    throw new BpmnParseError('The BPMN XML is not well-formed.')
  }

  return document
}

function hasParserError(document: Document): boolean {
  if (document.documentElement.localName === 'parsererror') return true
  return Array.from(document.getElementsByTagName('*')).some(
    (element) => element.localName === 'parsererror',
  )
}

function findFirstProcess(document: Document): Element {
  const process = Array.from(document.getElementsByTagName('*')).find(
    (element) => element.localName === 'process',
  )
  if (!process) {
    throw new BpmnParseError('The document does not contain a BPMN process.')
  }
  return process
}

function readFlowNode(element: Element, type: string, seenIds: Set<string>): FlowNode {
  const id = requiredAttribute(element, 'id', `A ${type} element is missing an id.`)
  rememberId(seenIds, id)
  const name = optionalName(element.getAttribute('name'))
  return name ? { id, type, name } : { id, type }
}

function readSequenceFlow(element: Element, seenIds: Set<string>): SequenceFlow {
  const id = element.getAttribute('id')?.trim()
  if (!id) throw new BpmnParseError('A sequence flow is missing an id.')
  rememberId(seenIds, id)

  const sourceId = element.getAttribute('sourceRef')?.trim()
  const targetId = element.getAttribute('targetRef')?.trim()
  if (!sourceId || !targetId) {
    throw new BpmnParseError(`Sequence flow "${id}" is missing sourceRef or targetRef.`)
  }

  const name = optionalName(element.getAttribute('name'))
  return name ? { id, name, sourceId, targetId } : { id, sourceId, targetId }
}

function requiredAttribute(element: Element, name: string, message: string): string {
  const value = element.getAttribute(name)?.trim()
  if (!value) throw new BpmnParseError(message)
  return value
}

function rememberId(seenIds: Set<string>, id: string): void {
  if (seenIds.has(id)) throw new BpmnParseError(`Duplicate BPMN id "${id}".`)
  seenIds.add(id)
}

function optionalName(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
