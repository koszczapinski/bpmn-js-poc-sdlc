import { describe, expect, it } from 'vitest'
import { parseBpmnXml } from './parseBpmnXml'
import { INVOICE_APPROVAL_XML } from '../bpmn/sample'
import { validateProcess } from '../domain/validateProcess'

describe('bundled invoice approval diagram', () => {
  it('AC-FLOW-1 and AC-VAL-6: matches the invoice flow and passes the structural subset', () => {
    expect(INVOICE_APPROVAL_XML).toContain('isExecutable="false"')
    expect(INVOICE_APPROVAL_XML).toContain('${amount &gt; 1000}')
    expect(INVOICE_APPROVAL_XML).toContain('${invoiceValid == false}')

    const model = parseBpmnXml(INVOICE_APPROVAL_XML)

    expect(model).toMatchObject({
      id: 'Process_InvoiceApproval',
      name: 'Invoice approval',
    })
    expect(model.nodes).toEqual([
      { id: 'Start_Received', type: 'startEvent', name: 'Invoice received' },
      { id: 'Task_Validate', type: 'userTask', name: 'Clerk validation' },
      { id: 'Gateway_Valid', type: 'exclusiveGateway', name: 'Valid?' },
      { id: 'Task_Clarify', type: 'userTask', name: 'Request clarification' },
      { id: 'Gateway_Amount', type: 'exclusiveGateway', name: 'Amount > 1000 PLN?' },
      { id: 'Task_AutoApprove', type: 'serviceTask', name: 'Automatic approval' },
      { id: 'Task_ManagerApprove', type: 'userTask', name: 'Manager approval' },
      { id: 'Task_Archive', type: 'serviceTask', name: 'Archive invoice' },
      { id: 'End_Archived', type: 'endEvent', name: 'End' },
    ])
    expect(model.flows).toEqual([
      { id: 'Flow_ToValidation', sourceId: 'Start_Received', targetId: 'Task_Validate' },
      { id: 'Flow_ToValidGateway', sourceId: 'Task_Validate', targetId: 'Gateway_Valid' },
      { id: 'Flow_Valid', name: 'Yes', sourceId: 'Gateway_Valid', targetId: 'Gateway_Amount' },
      { id: 'Flow_Invalid', name: 'No', sourceId: 'Gateway_Valid', targetId: 'Task_Clarify' },
      {
        id: 'Flow_ClarifyReturn',
        sourceId: 'Task_Clarify',
        targetId: 'Task_Validate',
      },
      {
        id: 'Flow_Auto',
        name: '≤ 1000 PLN',
        sourceId: 'Gateway_Amount',
        targetId: 'Task_AutoApprove',
      },
      {
        id: 'Flow_Manager',
        name: '> 1000 PLN',
        sourceId: 'Gateway_Amount',
        targetId: 'Task_ManagerApprove',
      },
      { id: 'Flow_AutoArchive', sourceId: 'Task_AutoApprove', targetId: 'Task_Archive' },
      { id: 'Flow_ManagerArchive', sourceId: 'Task_ManagerApprove', targetId: 'Task_Archive' },
      { id: 'Flow_ToEnd', sourceId: 'Task_Archive', targetId: 'End_Archived' },
    ])
    expect(validateProcess(model)).toEqual([])
  })

  it('AC-FLOW-1: every label in the bundled diagram is English', () => {
    const labels = [...INVOICE_APPROVAL_XML.matchAll(/\bname="([^"]*)"/g)].map((match) => match[1])
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) expect(label).not.toMatch(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)
    expect(INVOICE_APPROVAL_XML).not.toMatch(/Walidacja|Faktura|Kwota|Koniec|Zatwierdzenie/)
  })
})
