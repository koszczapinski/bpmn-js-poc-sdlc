export const FLOW_NODE_TYPES = [
  'startEvent',
  'endEvent',
  'intermediateCatchEvent',
  'intermediateThrowEvent',
  'boundaryEvent',
  'implicitThrowEvent',
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'businessRuleTask',
  'manualTask',
  'sendTask',
  'receiveTask',
  'callActivity',
  'subProcess',
  'transaction',
  'adHocSubProcess',
  'exclusiveGateway',
  'parallelGateway',
  'inclusiveGateway',
  'eventBasedGateway',
  'complexGateway',
] as const

const FLOW_NODE_TYPE_SET: ReadonlySet<string> = new Set(FLOW_NODE_TYPES)

export function isFlowNodeType(value: string): boolean {
  return FLOW_NODE_TYPE_SET.has(value)
}
