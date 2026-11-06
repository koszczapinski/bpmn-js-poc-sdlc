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

export interface Finding {
  id: string
  code: FindingCode
  elementId?: string
  message: string
}
