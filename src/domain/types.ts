export interface FlowNode {
  id: string
  type: string
  name?: string
}

export interface SequenceFlow {
  id: string
  name?: string
  sourceId: string
  targetId: string
}

export interface BpmnProcessModel {
  id: string
  name?: string
  nodes: FlowNode[]
  flows: SequenceFlow[]
}

export type FindingCode =
  | 'missing-start'
  | 'missing-end'
  | 'missing-incoming'
  | 'missing-outgoing'
  | 'exclusive-gateway-outgoing'

/** The values a node finding's sentence is built from, so a UI can word it in any language. */
export interface FindingParams {
  nodeType: string
  nodeId: string
  nodeName?: string
  count?: number
}

export interface Finding {
  id: string
  code: FindingCode
  elementId?: string
  /** English text. The UI words the same finding from `code` and `params`. */
  message: string
  params?: FindingParams
}
