import { describe, expect, it } from 'vitest'
import type { BpmnProcessModel, FlowNode, SequenceFlow } from './types'
import { validateProcess } from './validateProcess'

function model(nodes: FlowNode[], flows: SequenceFlow[]): BpmnProcessModel {
  return { id: 'Process_Test', nodes, flows }
}

const start: FlowNode = { id: 'Start_1', type: 'startEvent', name: 'Start' }
const end: FlowNode = { id: 'End_1', type: 'endEvent', name: 'End' }

describe('validateProcess', () => {
  it('AC-VAL-6 fixture shape: a connected start and end has no findings', () => {
    const findings = validateProcess(
      model([start, end], [{ id: 'Flow_1', sourceId: start.id, targetId: end.id }]),
    )
    expect(findings).toEqual([])
  })

  it('AC-VAL-1: reports a process with no start event', () => {
    const task: FlowNode = { id: 'Task_Step', type: 'userTask', name: 'Step' }
    const findings = validateProcess(
      model([task, end], [{ id: 'Flow_1', sourceId: task.id, targetId: end.id }]),
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'The process has no start event.',
      'User task "Step" (Task_Step) has no incoming sequence flow.',
    ])
    expect(findings[0]?.id).toBe('missing-start:process')
    expect(findings[0]?.elementId).toBeUndefined()
  })

  it('AC-VAL-2: reports a process with no end event', () => {
    const task: FlowNode = { id: 'Task_Step', type: 'userTask' }
    const findings = validateProcess(
      model([start, task], [{ id: 'Flow_1', sourceId: start.id, targetId: task.id }]),
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'The process has no end event.',
      'User task Task_Step has no outgoing sequence flow.',
    ])
  })

  it('AC-VAL-3 and AC-VAL-4: reports a disconnected node and a start or end with a missing flow', () => {
    const lone: FlowNode = { id: 'Task_Lone', type: 'userTask', name: 'Osierocony krok' }
    const bareStart: FlowNode = { id: 'Start_Bare', type: 'startEvent', name: 'Start' }
    const bareEnd: FlowNode = { id: 'End_Bare', type: 'endEvent', name: 'Koniec' }
    const bridge: FlowNode = { id: 'Task_Bridge', type: 'task' }

    const disconnected = validateProcess(
      model([start, end, lone], [{ id: 'Flow_1', sourceId: start.id, targetId: end.id }]),
    )
    expect(disconnected.map((finding) => finding.message)).toEqual([
      'User task "Osierocony krok" (Task_Lone) has no incoming sequence flow.',
      'User task "Osierocony krok" (Task_Lone) has no outgoing sequence flow.',
    ])

    const startWithoutOutgoing = validateProcess(
      model([bareStart, bridge, end], [{ id: 'Flow_1', sourceId: bridge.id, targetId: end.id }]),
    )
    expect(startWithoutOutgoing.map((finding) => finding.code)).toEqual([
      'missing-outgoing',
      'missing-incoming',
    ])
    expect(startWithoutOutgoing[0]?.elementId).toBe('Start_Bare')

    const endWithoutIncoming = validateProcess(
      model([start, bridge, bareEnd], [{ id: 'Flow_1', sourceId: start.id, targetId: bridge.id }]),
    )
    expect(endWithoutIncoming.map((finding) => finding.message)).toContain(
      'End event "Koniec" (End_Bare) has no incoming sequence flow.',
    )
  })

  it('AC-VAL-5: an exclusive gateway needs two outgoing flows, including when it has none', () => {
    const thin: FlowNode = { id: 'Gateway_Thin', type: 'exclusiveGateway', name: 'Decyzja' }
    const oneOutgoing = validateProcess(
      model(
        [start, thin, end],
        [
          { id: 'Flow_1', sourceId: start.id, targetId: thin.id },
          { id: 'Flow_2', sourceId: thin.id, targetId: end.id },
        ],
      ),
    )
    expect(oneOutgoing).toEqual([
      {
        id: 'exclusive-gateway-outgoing:Gateway_Thin',
        code: 'exclusive-gateway-outgoing',
        elementId: 'Gateway_Thin',
        message:
          'Exclusive gateway "Decyzja" (Gateway_Thin) has 1 outgoing sequence flow; at least 2 are required.',
      },
    ])

    const closed: FlowNode = { id: 'Gateway_Closed', type: 'exclusiveGateway' }
    const noOutgoing = validateProcess(
      model([start, closed, end], [{ id: 'Flow_1', sourceId: start.id, targetId: closed.id }]),
    )
    expect(noOutgoing.map((finding) => finding.message)).toEqual([
      'Exclusive gateway Gateway_Closed has no outgoing sequence flow.',
      'Exclusive gateway Gateway_Closed has 0 outgoing sequence flows; at least 2 are required.',
      'End event "End" (End_1) has no incoming sequence flow.',
    ])
  })

  it('does not apply the exclusive-gateway rule to a parallel gateway', () => {
    const parallel: FlowNode = { id: 'Gateway_And', type: 'parallelGateway' }
    const findings = validateProcess(
      model(
        [start, parallel, end],
        [
          { id: 'Flow_1', sourceId: start.id, targetId: parallel.id },
          { id: 'Flow_2', sourceId: parallel.id, targetId: end.id },
        ],
      ),
    )
    expect(findings).toEqual([])
  })

  it('accepts an exclusive gateway that splits to two ends', () => {
    const split: FlowNode = { id: 'Gateway_Split', type: 'exclusiveGateway', name: 'Kwota' }
    const otherEnd: FlowNode = { id: 'End_2', type: 'endEvent' }
    const findings = validateProcess(
      model(
        [start, split, end, otherEnd],
        [
          { id: 'Flow_1', sourceId: start.id, targetId: split.id },
          { id: 'Flow_2', sourceId: split.id, targetId: end.id },
          { id: 'Flow_3', sourceId: split.id, targetId: otherEnd.id },
        ],
      ),
    )
    expect(findings).toEqual([])
  })
})
