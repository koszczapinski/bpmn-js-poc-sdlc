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
      name: 'Zatwierdzenie faktury',
    })
    expect(model.nodes).toEqual([
      { id: 'Start_Received', type: 'startEvent', name: 'Faktura otrzymana' },
      { id: 'Task_Validate', type: 'userTask', name: 'Walidacja przez referenta' },
      { id: 'Gateway_Valid', type: 'exclusiveGateway', name: 'Poprawna?' },
      { id: 'Task_Clarify', type: 'userTask', name: 'Prośba o wyjaśnienie' },
      { id: 'Gateway_Amount', type: 'exclusiveGateway', name: 'Kwota > 1000 PLN?' },
      { id: 'Task_AutoApprove', type: 'serviceTask', name: 'Automatyczne zatwierdzenie' },
      { id: 'Task_ManagerApprove', type: 'userTask', name: 'Zatwierdzenie kierownika' },
      { id: 'Task_Archive', type: 'serviceTask', name: 'Archiwizacja faktury' },
      { id: 'End_Archived', type: 'endEvent', name: 'Koniec' },
    ])
    expect(model.flows).toEqual([
      { id: 'Flow_ToValidation', sourceId: 'Start_Received', targetId: 'Task_Validate' },
      { id: 'Flow_ToValidGateway', sourceId: 'Task_Validate', targetId: 'Gateway_Valid' },
      { id: 'Flow_Valid', name: 'Tak', sourceId: 'Gateway_Valid', targetId: 'Gateway_Amount' },
      { id: 'Flow_Invalid', name: 'Nie', sourceId: 'Gateway_Valid', targetId: 'Task_Clarify' },
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
})
