import { flowNodeLabel } from './typeLabels'
import type { BpmnProcessModel, Finding, FlowNode } from './types'

/**
 * Structural checks for a single process model.
 * This is not a BPMN 2.0 schema check and it does not execute the process.
 * A passing result only means the rules in this file found nothing.
 */
export function validateProcess(model: BpmnProcessModel): Finding[] {
  const findings: Finding[] = []
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()

  for (const flow of model.flows) {
    outgoing.set(flow.sourceId, (outgoing.get(flow.sourceId) ?? 0) + 1)
    incoming.set(flow.targetId, (incoming.get(flow.targetId) ?? 0) + 1)
  }

  if (!model.nodes.some((node) => node.type === 'startEvent')) {
    findings.push({
      id: 'missing-start:process',
      code: 'missing-start',
      message: 'The process has no start event.',
    })
  }

  if (!model.nodes.some((node) => node.type === 'endEvent')) {
    findings.push({
      id: 'missing-end:process',
      code: 'missing-end',
      message: 'The process has no end event.',
    })
  }

  for (const node of model.nodes) {
    const incomingCount = incoming.get(node.id) ?? 0
    const outgoingCount = outgoing.get(node.id) ?? 0

    if (node.type !== 'startEvent' && incomingCount === 0) {
      findings.push(
        nodeFinding(node, 'missing-incoming', `${describe(node)} has no incoming sequence flow.`),
      )
    }

    if (node.type !== 'endEvent' && outgoingCount === 0) {
      findings.push(
        nodeFinding(node, 'missing-outgoing', `${describe(node)} has no outgoing sequence flow.`),
      )
    }

    if (node.type === 'exclusiveGateway' && outgoingCount < 2) {
      const noun = outgoingCount === 1 ? 'flow' : 'flows'
      findings.push(
        nodeFinding(
          node,
          'exclusive-gateway-outgoing',
          `${describe(node)} has ${outgoingCount} outgoing sequence ${noun}; at least 2 are required.`,
        ),
      )
    }
  }

  return findings
}

function nodeFinding(node: FlowNode, code: Finding['code'], message: string): Finding {
  return {
    id: `${code}:${node.id}`,
    code,
    elementId: node.id,
    message,
  }
}

function describe(node: FlowNode): string {
  const type = flowNodeLabel(node.type)
  if (node.name) return `${type} "${node.name}" (${node.id})`
  return `${type} ${node.id}`
}
