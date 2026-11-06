const TYPE_LABELS: Record<string, string> = {
  startEvent: 'Start event',
  endEvent: 'End event',
  intermediateCatchEvent: 'Intermediate catch event',
  intermediateThrowEvent: 'Intermediate throw event',
  boundaryEvent: 'Boundary event',
  implicitThrowEvent: 'Implicit throw event',
  task: 'Task',
  userTask: 'User task',
  serviceTask: 'Service task',
  scriptTask: 'Script task',
  businessRuleTask: 'Business rule task',
  manualTask: 'Manual task',
  sendTask: 'Send task',
  receiveTask: 'Receive task',
  callActivity: 'Call activity',
  subProcess: 'Sub-process',
  transaction: 'Transaction',
  adHocSubProcess: 'Ad-hoc sub-process',
  exclusiveGateway: 'Exclusive gateway',
  parallelGateway: 'Parallel gateway',
  inclusiveGateway: 'Inclusive gateway',
  eventBasedGateway: 'Event-based gateway',
  complexGateway: 'Complex gateway',
  sequenceFlow: 'Sequence flow',
}

export function flowNodeLabel(type: string): string {
  const withoutPrefix = type.startsWith('bpmn:') ? type.slice('bpmn:'.length) : type
  const local = withoutPrefix.charAt(0).toLowerCase() + withoutPrefix.slice(1)
  return TYPE_LABELS[local] ?? local
}
