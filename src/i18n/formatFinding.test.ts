import { describe, expect, it } from 'vitest'
import type { BpmnProcessModel } from '../domain/types'
import { validateProcess } from '../domain/validateProcess'
import { formatFinding } from './formatFinding'

const broken: BpmnProcessModel = {
  id: 'Process_Broken',
  nodes: [
    { id: 'Task_Lone', type: 'userTask', name: 'Lone step' },
    { id: 'Task_Bare', type: 'serviceTask' },
    { id: 'Gateway_Thin', type: 'exclusiveGateway', name: 'Decision' },
    { id: 'Gateway_Dead', type: 'exclusiveGateway' },
    { id: 'End_1', type: 'endEvent' },
  ],
  flows: [{ id: 'Flow_1', sourceId: 'Gateway_Thin', targetId: 'End_1' }],
}

const empty: BpmnProcessModel = { id: 'Process_Empty', nodes: [], flows: [] }

describe('formatFinding', () => {
  const findings = [...validateProcess(empty), ...validateProcess(broken)]

  it('covers every finding code', () => {
    expect(new Set(findings.map((finding) => finding.code))).toEqual(
      new Set([
        'missing-start',
        'missing-end',
        'missing-incoming',
        'missing-outgoing',
        'exclusive-gateway-outgoing',
      ]),
    )
  })

  it('AC-I18N-4: the English text equals the English message the domain produced', () => {
    for (const finding of findings)
      expect(formatFinding('en', finding), finding.id).toBe(finding.message)
  })

  it('AC-I18N-2: builds Polish sentences from the code and params', () => {
    const text = (id: string) => {
      const finding = findings.find((candidate) => candidate.id === id)
      if (!finding) throw new Error(`No finding ${id}`)
      return formatFinding('pl', finding)
    }

    expect(text('missing-start:process')).toBe('Proces nie ma zdarzenia początkowego.')
    expect(text('missing-end:process')).toBe('Proces nie ma zdarzenia końcowego.')
    expect(text('missing-incoming:Task_Lone')).toBe(
      'Zadanie użytkownika "Lone step" (Task_Lone) nie ma przychodzącego przepływu sekwencji.',
    )
    expect(text('missing-outgoing:Task_Bare')).toBe(
      'Zadanie usługowe Task_Bare nie ma wychodzącego przepływu sekwencji.',
    )
    expect(text('exclusive-gateway-outgoing:Gateway_Thin')).toBe(
      'Bramka wyłączna "Decision" (Gateway_Thin) ma 1 wychodzący przepływ sekwencji; wymagane są co najmniej 2.',
    )
    expect(text('exclusive-gateway-outgoing:Gateway_Dead')).toBe(
      'Bramka wyłączna Gateway_Dead ma 0 wychodzących przepływów sekwencji; wymagane są co najmniej 2.',
    )
  })

  it('falls back to the English message when a finding has no params it needs', () => {
    expect(
      formatFinding('pl', {
        id: 'missing-incoming:X',
        code: 'missing-incoming',
        elementId: 'X',
        message: 'Task X has no incoming sequence flow.',
      }),
    ).toBe('Task X has no incoming sequence flow.')
  })
})
