import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { BLANK_PROCESS_XML } from './bpmn/sample'

const { modelerState, MockModeler } = vi.hoisted(() => {
  type Listener = (event: unknown) => void
  const modelerState: {
    importImpl: (xml: string) => Promise<{ warnings?: unknown[] }>
    saveXml: string | null
    missingIds: Set<string>
  } = {
    importImpl: async () => ({ warnings: [] }),
    saveXml: null,
    missingIds: new Set(),
  }

  function definitionsFromXml(xml: string): {
    rootElements: Array<{ $type: string; flowElements: Array<{ $type: string }> }>
  } {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml')
    const processes = Array.from(parsed.getElementsByTagName('*')).filter(
      (element) => element.localName === 'process',
    )
    return {
      rootElements: processes.map((process) => ({
        $type: 'bpmn:Process',
        flowElements: Array.from(process.children).flatMap((child) => {
          const localName = child.localName
          if (!localName) return []
          return [{ $type: `bpmn:${localName.charAt(0).toUpperCase()}${localName.slice(1)}` }]
        }),
      })),
    }
  }

  class MockModeler {
    static instances: MockModeler[] = []
    xml = ''
    definitions: {
      rootElements: Array<{ $type: string; flowElements?: Array<{ $type: string }> }>
    } = { rootElements: [] }
    private readonly listeners = new Map<string, Set<Listener>>()
    history = { canUndo: false, canRedo: false }
    importXML = vi.fn(async (xml: string) => {
      const result = await modelerState.importImpl(xml)
      this.xml = xml
      this.definitions = definitionsFromXml(xml)
      this.history = { canUndo: false, canRedo: false }
      return { warnings: result.warnings ?? [] }
    })
    saveXML = vi.fn(async () => ({ xml: modelerState.saveXml ?? this.xml }))
    saveSVG = vi.fn(async () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }))
    destroy = vi.fn()
    selection = {
      select: vi.fn(),
      get: vi.fn(() => [] as unknown[]),
    }
    toggleMode = {
      _active: false,
      toggleMode: vi.fn((active?: boolean) => {
        this.toggleMode._active = typeof active === 'boolean' ? active : !this.toggleMode._active
        this.emit('tokenSimulation.toggleMode', { active: this.toggleMode._active })
      }),
    }
    canvas = {
      addMarker: vi.fn(),
      removeMarker: vi.fn(),
      scrollToElement: vi.fn(),
      zoom: vi.fn(),
      resized: vi.fn(),
      viewbox: vi.fn((next?: { x: number; y: number; width: number; height: number }) => {
        if (next) return next
        return {
          x: 0,
          y: 0,
          width: 1200,
          height: 700,
          scale: 1,
          inner: { x: 72, y: 48, width: 1200, height: 480 },
          outer: { width: 1200, height: 700 },
        }
      }),
    }
    registry = {
      get: vi.fn((id: string) => {
        if (modelerState.missingIds.has(id)) return undefined
        const isService = id.includes('AutoApprove') || id.includes('Archive')
        return {
          id,
          type: isService ? 'bpmn:ServiceTask' : 'bpmn:UserTask',
          businessObject: { name: 'Element', extensionElements: { values: [] } },
        }
      }),
    }
    modeling = {
      updateProperties: vi.fn(),
      updateModdleProperties: vi.fn(),
    }
    bpmnFactory = {
      create: vi.fn((type: string, props?: Record<string, unknown>) => ({
        $type: type,
        ...props,
      })),
    }
    moddle = {
      create: vi.fn((type: string, props?: Record<string, unknown>) => ({
        $type: type,
        ...props,
      })),
    }
    commandStack = {
      canUndo: vi.fn(() => this.history.canUndo),
      canRedo: vi.fn(() => this.history.canRedo),
      undo: vi.fn(() => {
        this.history = { canUndo: false, canRedo: true }
        this.emit('commandStack.changed', {})
      }),
      redo: vi.fn(() => {
        this.history = { canUndo: true, canRedo: false }
        this.emit('commandStack.changed', {})
      }),
    }

    constructor() {
      MockModeler.instances.push(this)
    }

    on(event: string, callback: Listener) {
      const listeners = this.listeners.get(event) ?? new Set<Listener>()
      listeners.add(callback)
      this.listeners.set(event, listeners)
    }

    off(event: string, callback: Listener) {
      this.listeners.get(event)?.delete(callback)
    }

    get(service: string) {
      if (service === 'canvas') return this.canvas
      if (service === 'selection') return this.selection
      if (service === 'elementRegistry') return this.registry
      if (service === 'modeling') return this.modeling
      if (service === 'commandStack') return this.commandStack
      if (service === 'bpmnFactory') return this.bpmnFactory
      if (service === 'moddle') return this.moddle
      if (service === 'toggleMode') return this.toggleMode
      throw new Error(`Unexpected service ${service}`)
    }

    emit(event: string, payload: unknown) {
      for (const callback of this.listeners.get(event) ?? []) callback(payload)
    }

    getDefinitions() {
      return this.definitions
    }
  }

  return { modelerState, MockModeler }
})

vi.mock('bpmn-js/lib/Modeler', () => ({ default: MockModeler }))

function activeModeler() {
  const modeler = MockModeler.instances.at(-1)
  if (!modeler) throw new Error('The modeler was not created.')
  return modeler
}

async function renderReady() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('Diagram ready')
  return { user, modeler: activeModeler() }
}

async function renderFailedImport() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('alert')
  return { user }
}

function bpmnFile(xml: string, name: string): File {
  return new File([xml], name, { type: 'text/xml' })
}

function expectBlankProcess(xml: string) {
  expect(xml).toContain('id="Process_Blank"')
  expect(xml).toContain('isExecutable="false"')
  expect(xml).toContain('BPMNPlane')
  expect(xml.match(/<bpmn:process\b/g)).toHaveLength(1)
  expect(xml).not.toContain('Process_InvoiceApproval')
  expect(xml).not.toMatch(
    /startEvent|endEvent|sequenceFlow|userTask|serviceTask|exclusiveGateway|BPMNShape|BPMNEdge/,
  )
}

function expectNoPrompt() {
  expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox', { name: 'Polecenie' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Generate diagram' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Generuj diagram' })).not.toBeInTheDocument()
}

function showSelection(modeler: ReturnType<typeof activeModeler>, id: string, name: string) {
  const selected = {
    id,
    type: 'bpmn:UserTask',
    businessObject: { name },
  }
  // Saving XML re-reads the modeler's selection. Drop it only once an import succeeds.
  modeler.selection.get.mockReturnValue([selected])
  const original = modeler.importXML.getMockImplementation()
  modeler.importXML.mockImplementation(async (xml: string) => {
    if (!original) throw new Error('The modeler import has no implementation.')
    const result = await original.call(modeler, xml)
    modeler.selection.get.mockReturnValue([])
    return result ?? { warnings: [] }
  })
  act(() => {
    modeler.emit('selection.changed', { newSelection: [selected] })
  })
}

const brokenXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="Process_Broken">
    <startEvent id="Start_1" name="Start" />
    <endEvent id="End_1" name="End" />
    <userTask id="Task_Lone" name="Osierocony krok" />
    <exclusiveGateway id="Gateway_Thin" name="Decyzja" />
    <sequenceFlow id="Flow_Ok" sourceRef="Start_1" targetRef="End_1" />
    <sequenceFlow id="Flow_One" sourceRef="Gateway_Thin" targetRef="End_1" />
  </process>
</definitions>`

const drawnNodeXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_Drawn" isExecutable="false">
    <bpmn:startEvent id="Start_Drawn" />
  </bpmn:process>
</bpmn:definitions>`

function processDiagram(flowTypes: string[]) {
  return {
    rootElements: [
      {
        $type: 'bpmn:Process',
        flowElements: flowTypes.map((type) => ({ $type: type })),
      },
    ],
  }
}

const POLISH_PROMPT = 'wygeneruj diagram dla obiegu dokumentów prawnych'
const ENGLISH_PROMPT = 'generate a diagram for a legal document workflow'

const LEGAL_NODES = [
  'Start_Legal',
  'Task_ReceiveDocument',
  'Task_ReviewDocument',
  'Gateway_Accepted',
  'Task_FileDocument',
  'End_Filed',
  'Task_ReturnToAuthor',
  'End_Returned',
] as const

const LEGAL_FLOWS = [
  ['Flow_ToReceive', 'Start_Legal', 'Task_ReceiveDocument'],
  ['Flow_ToReview', 'Task_ReceiveDocument', 'Task_ReviewDocument'],
  ['Flow_ToGateway', 'Task_ReviewDocument', 'Gateway_Accepted'],
  ['Flow_Accepted', 'Gateway_Accepted', 'Task_FileDocument'],
  ['Flow_ToFiled', 'Task_FileDocument', 'End_Filed'],
  ['Flow_Rejected', 'Gateway_Accepted', 'Task_ReturnToAuthor'],
  ['Flow_ToReturned', 'Task_ReturnToAuthor', 'End_Returned'],
] as const

function expectPreparedXml(xml: string, language: 'pl' | 'en') {
  const names =
    language === 'pl'
      ? {
          process: 'Obieg dokumentów prawnych',
          receive: 'Przyjmij dokument',
          review: 'Zweryfikuj dokument',
          gateway: 'Przyjęty?',
          accepted: 'Tak',
          file: 'Złóż do akt',
          filed: 'Złożony',
          rejected: 'Nie',
          returnToAuthor: 'Zwróć autorowi',
          returned: 'Zwrócony',
        }
      : {
          process: 'Legal document workflow',
          receive: 'Receive document',
          review: 'Review document',
          gateway: 'Accepted?',
          accepted: 'Yes',
          file: 'File the document',
          filed: 'Filed',
          rejected: 'No',
          returnToAuthor: 'Return to author',
          returned: 'Returned',
        }

  expect(xml.match(/<bpmn:process\b/g)).toHaveLength(1)
  expect(xml).toContain('id="Process_LegalDocuments"')
  expect(xml).toContain(`name="${names.process}"`)
  expect(xml).toContain('isExecutable="false"')
  expect(xml).not.toContain('conditionExpression')
  expect(xml).toContain('default="Flow_Accepted"')
  expect(xml).toContain(`<bpmn:startEvent id="Start_Legal"`)
  expect(xml).toContain(`<bpmn:userTask id="Task_ReceiveDocument" name="${names.receive}"`)
  expect(xml).toContain(`<bpmn:userTask id="Task_ReviewDocument" name="${names.review}"`)
  expect(xml).toContain(`<bpmn:exclusiveGateway id="Gateway_Accepted" name="${names.gateway}"`)
  expect(xml).toContain(`<bpmn:serviceTask id="Task_FileDocument" name="${names.file}"`)
  expect(xml).toContain(`<bpmn:endEvent id="End_Filed" name="${names.filed}"`)
  expect(xml).toContain(`<bpmn:userTask id="Task_ReturnToAuthor" name="${names.returnToAuthor}"`)
  expect(xml).toContain(`<bpmn:endEvent id="End_Returned" name="${names.returned}"`)
  expect(xml).toContain(
    `<bpmn:sequenceFlow id="Flow_Accepted" name="${names.accepted}" sourceRef="Gateway_Accepted" targetRef="Task_FileDocument"`,
  )
  expect(xml).toContain(
    `<bpmn:sequenceFlow id="Flow_Rejected" name="${names.rejected}" sourceRef="Gateway_Accepted" targetRef="Task_ReturnToAuthor"`,
  )
  for (const [id, source, target] of LEGAL_FLOWS) {
    if (id === 'Flow_Accepted' || id === 'Flow_Rejected') continue
    expect(xml).toContain(
      `<bpmn:sequenceFlow id="${id}" sourceRef="${source}" targetRef="${target}"`,
    )
  }
  for (const id of LEGAL_NODES) {
    expect(xml).toContain(`<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"`)
  }
  for (const [id] of LEGAL_FLOWS) {
    expect(xml).toContain(`<bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}"`)
  }
  expect(xml).toContain('xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"')
  expect(xml).toContain('<zeebe:formDefinition formId="receive-legal-document" />')
  expect(xml).toContain('<zeebe:formDefinition formId="review-legal-document" />')
  expect(xml).toContain('<zeebe:formDefinition formId="return-legal-document" />')
  expect(xml).toContain('<zeebe:taskDefinition type="file-legal-document" />')
}

async function openBlank(user: ReturnType<typeof userEvent.setup>) {
  const modeler = activeModeler()
  const imports = modeler.importXML.mock.calls.length
  await user.click(screen.getByRole('button', { name: 'New diagram' }))
  await waitFor(() => expect(modeler.importXML.mock.calls.length).toBeGreaterThan(imports))
  const prompt = await screen.findByRole('textbox', { name: 'Prompt' })
  return { modeler, prompt }
}

describe('App', () => {
  beforeEach(() => {
    MockModeler.instances = []
    modelerState.importImpl = async () => ({ warnings: [] })
    modelerState.saveXml = null
    modelerState.missingIds = new Set()
  })

  it('AC-UI-1 and AC-FLOW-2: shows a loading state, then imports the bundled diagram', async () => {
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Opening the invoice diagram…')

    expect(await screen.findByRole('status')).toHaveTextContent('Diagram ready')
    const modeler = activeModeler()
    const xml = String(modeler.importXML.mock.calls[0]?.[0])
    expect(xml).toContain('Process_InvoiceApproval')
    expect(xml).toContain('Clerk validation')
    expect(xml).toContain('Gateway_Amount')
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(screen.getByText(/Not a BPMN 2.0 schema check or a process engine/)).toBeInTheDocument()
    expect(screen.getByText('Not checked yet.')).toBeInTheDocument()
    expectNoPrompt()
  })

  it('AC-UI-2: shows the import error and does not claim the diagram is ready', async () => {
    modelerState.importImpl = async () => {
      throw new Error('parser blew up')
    }
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('parser blew up')
    expect(screen.getByRole('status')).toHaveTextContent('The diagram could not be opened')
  })

  it('shows import warnings without failing the diagram', async () => {
    modelerState.importImpl = async () => ({ warnings: [{ message: 'Render skipped a label.' }] })
    render(<App />)
    expect(await screen.findByText('Render skipped a label.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Diagram ready')
  })

  it('AC-VAL-6 and AC-VAL-8: validating the bundled sample reports no structural issues', async () => {
    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
  })

  it('AC-PARSE-6: shows a parser error from the modeler XML instead of a pass', async () => {
    modelerState.saveXml = '<definitions><process id="P">'
    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The BPMN XML is not well-formed.')
    expect(screen.queryByText('No structural issues in this subset.')).not.toBeInTheDocument()
  })

  it('AC-VAL-7: selecting a finding focuses that element, and a missing element is explained', async () => {
    modelerState.saveXml = brokenXml
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))

    const gatewayFinding = await screen.findByRole('button', {
      name: 'Exclusive gateway "Decyzja" (Gateway_Thin) has 1 outgoing sequence flow; at least 2 are required.',
    })
    await user.click(gatewayFinding)
    expect(modeler.selection.select).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Gateway_Thin' }),
    )
    expect(modeler.canvas.addMarker).toHaveBeenCalledWith('Gateway_Thin', 'validation-focus')
    expect(modeler.canvas.scrollToElement).toHaveBeenCalledWith('Gateway_Thin', 80)

    modeler.selection.select.mockClear()
    modelerState.missingIds.add('Task_Lone')
    await user.click(
      screen.getByRole('button', {
        name: 'User task "Osierocony krok" (Task_Lone) has no incoming sequence flow.',
      }),
    )
    expect(modeler.selection.select).not.toHaveBeenCalled()
    expect(screen.getByText('"Task_Lone" is not on the current diagram.')).toBeInTheDocument()
  })

  it('selecting a process-level finding does not ask the canvas to select an element', async () => {
    modelerState.saveXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="Process_Only">
    <userTask id="Task_Only" name="Only" />
  </process>
</definitions>`
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    await user.click(await screen.findByRole('button', { name: 'The process has no start event.' }))
    expect(modeler.selection.select).not.toHaveBeenCalled()
  })

  it('AC-FLOW-3: selection shows id, type, and name, and committing a name updates the model', async () => {
    const { user, modeler } = await renderReady()
    act(() => {
      modeler.emit('selection.changed', {
        newSelection: [
          {
            id: 'Label_1',
            type: 'label',
            labelTarget: {
              id: 'Task_Validate',
              type: 'bpmn:UserTask',
              businessObject: { name: 'Walidacja przez referenta' },
            },
          },
        ],
      })
    })

    expect(screen.getByText('Task_Validate')).toBeInTheDocument()
    expect(screen.getByText('User task')).toBeInTheDocument()
    const name = screen.getByRole('textbox', { name: /Name/ })
    expect(name).toHaveValue('Walidacja przez referenta')

    await user.clear(name)
    await user.type(name, 'Nowa nazwa')
    await user.keyboard('{Enter}')
    expect(modeler.modeling.updateProperties).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Task_Validate' }),
      { name: 'Nowa nazwa' },
    )

    act(() => {
      modeler.emit('element.changed', {
        element: {
          id: 'Task_Validate',
          type: 'bpmn:UserTask',
          businessObject: { name: 'Po poprawce' },
        },
      })
    })
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Po poprawce')
  })

  it('AC-ZEEBE-1: ServiceTask selection displays Job Type and committing updates moddle properties', async () => {
    const { user, modeler } = await renderReady()
    act(() => {
      modeler.emit('selection.changed', {
        newSelection: [
          {
            id: 'Task_AutoApprove',
            type: 'bpmn:ServiceTask',
            businessObject: {
              name: 'Automatic approval',
              extensionElements: {
                values: [{ $type: 'zeebe:TaskDefinition', type: 'auto-approve-service' }],
              },
            },
          },
        ],
      })
    })

    expect(screen.getByText('Task_AutoApprove')).toBeInTheDocument()
    expect(screen.getByText('Service task')).toBeInTheDocument()
    const jobType = screen.getByRole('textbox', { name: /Job Type/i })
    expect(jobType).toHaveValue('auto-approve-service')

    await user.clear(jobType)
    await user.type(jobType, 'custom-approval-worker')
    await user.keyboard('{Enter}')

    expect(modeler.modeling.updateModdleProperties).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Task_AutoApprove' }),
      expect.anything(),
      expect.objectContaining({
        values: expect.arrayContaining([
          expect.objectContaining({ type: 'custom-approval-worker' }),
        ]),
      }),
    )
  })

  it('AC-ZEEBE-3: UserTask selection displays Form ID and committing updates moddle properties', async () => {
    const { user, modeler } = await renderReady()
    act(() => {
      modeler.emit('selection.changed', {
        newSelection: [
          {
            id: 'Task_ManagerApprove',
            type: 'bpmn:UserTask',
            businessObject: {
              name: 'Manager approval',
              extensionElements: {
                values: [{ $type: 'zeebe:FormDefinition', formId: 'Form_ManagerApproval' }],
              },
            },
          },
        ],
      })
    })

    expect(screen.getByText('Task_ManagerApprove')).toBeInTheDocument()
    expect(screen.getByText('User task')).toBeInTheDocument()
    const formId = screen.getByRole('textbox', { name: /Form ID/i })
    expect(formId).toHaveValue('Form_ManagerApproval')

    await user.clear(formId)
    await user.type(formId, 'Form_CustomReview')
    await user.keyboard('{Enter}')

    expect(modeler.modeling.updateModdleProperties).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Task_ManagerApprove' }),
      expect.anything(),
      expect.objectContaining({
        values: expect.arrayContaining([expect.objectContaining({ formId: 'Form_CustomReview' })]),
      }),
    )
  })

  it('AC-SIM-1: toggling simulation switches token simulation state', async () => {
    const { user, modeler } = await renderReady()
    const simButton = screen.getByRole('button', { name: 'Simulation' })
    expect(simButton).toBeInTheDocument()
    const xmlBefore = modeler.xml
    const imports = modeler.importXML.mock.calls.length

    await user.click(simButton)
    expect(modeler.toggleMode.toggleMode).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    expect(modeler.xml).toBe(xmlBefore)
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(modeler.modeling.updateProperties).not.toHaveBeenCalled()
    expect(modeler.modeling.updateModdleProperties).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Stop simulation' }))
    expect(modeler.toggleMode.toggleMode).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('button', { name: 'Simulation' })).toBeInTheDocument()
  })

  it('AC-SIM-1: a successful Open BPMN ends token simulation', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile(brokenXml, 'mine.bpmn'))

    await waitFor(() => expect(modeler.importXML).toHaveBeenLastCalledWith(brokenXml))
    expect(modeler.toggleMode._active).toBe(false)
    expect(screen.getByRole('button', { name: 'Simulation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop simulation' })).not.toBeInTheDocument()
  })

  it('AC-SIM-1: a rejected Open BPMN leaves token simulation on', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    modelerState.importImpl = async (xml) => {
      if (xml === 'not bpmn') throw new Error('unparsable content')
      return { warnings: [] }
    }

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile('not bpmn', 'bad.bpmn'))

    expect(await screen.findByRole('alert')).toHaveTextContent('unparsable content')
    expect(screen.getByText('No structural issues in this subset.')).toBeInTheDocument()
    expect(modeler.xml).toContain('Process_InvoiceApproval')
    expect(modeler.toggleMode._active).toBe(true)
    expect(screen.getByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
  })

  it('AC-SVG-1: downloads the SVG currently returned by the modeler', async () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:svg-invoice'
    })
    let download = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      download = this.download
    })

    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Export SVG' }))

    expect(download).toBe('invoice-approval.svg')
    expect(blobs).toHaveLength(1)
    await expect(blobs[0]?.text()).resolves.toContain('<svg')
  })

  it('AC-NAV-1: floating zoom and fit controls manipulate canvas zoom and fit', async () => {
    const { user, modeler } = await renderReady()
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' })
    const zoomFit = screen.getByRole('button', { name: 'Fit diagram' })

    await user.click(zoomIn)
    expect(modeler.canvas.zoom).toHaveBeenCalledWith(1.25)

    await user.click(zoomOut)
    expect(modeler.canvas.zoom).toHaveBeenCalledWith(0.8)

    await user.click(zoomFit)
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
  })

  it('AC-FLOW-7: Undo and Redo follow the modeler command stack', async () => {
    const { user, modeler } = await renderReady()
    const undo = screen.getByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    modeler.history = { canUndo: true, canRedo: false }
    act(() => modeler.emit('commandStack.changed', {}))
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()

    await user.click(undo)
    expect(modeler.commandStack.undo).toHaveBeenCalledTimes(1)
    expect(undo).toBeDisabled()
    expect(redo).toBeEnabled()

    await user.click(redo)
    expect(modeler.commandStack.redo).toHaveBeenCalledTimes(1)
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
  })

  it('AC-FLOW-7 and AC-STATE-1: undo clears a shown check result', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()

    modeler.history = { canUndo: true, canRedo: false }
    act(() => modeler.emit('commandStack.changed', {}))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('Not checked yet.')).toBeInTheDocument()
  })

  it('AC-FLOW-5: opening a file replaces the diagram and resets selection, check result, and history', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
    act(() => {
      modeler.emit('selection.changed', {
        newSelection: [
          { id: 'Task_Validate', type: 'bpmn:UserTask', businessObject: { name: 'Validate' } },
        ],
      })
    })
    modeler.history = { canUndo: true, canRedo: false }
    act(() => modeler.emit('commandStack.changed', {}))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    modeler.canvas.zoom.mockClear()

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile(brokenXml, 'mine.bpmn'))

    await waitFor(() => expect(modeler.importXML).toHaveBeenLastCalledWith(brokenXml))
    expect(await screen.findByText('Not checked yet.')).toBeInTheDocument()
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(screen.queryByRole('textbox', { name: /Name/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('AC-FLOW-5: choosing the same file twice opens it twice', async () => {
    const { user, modeler } = await renderReady()
    const input = screen.getByLabelText('BPMN file')
    const file = bpmnFile(brokenXml, 'mine.bpmn')

    await user.upload(input, file)
    await waitFor(() => expect(modeler.importXML).toHaveBeenCalledTimes(2))
    await user.upload(input, file)
    await waitFor(() => expect(modeler.importXML).toHaveBeenCalledTimes(3))
  })

  it('AC-FLOW-6: a rejected file shows an alert and keeps the open diagram and its check result', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
    modelerState.importImpl = async (xml) => {
      if (xml === 'not bpmn') throw new Error('unparsable content')
      return { warnings: [] }
    }

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile('not bpmn', 'bad.bpmn'))

    expect(await screen.findByRole('alert')).toHaveTextContent('unparsable content')
    expect(screen.getByRole('status')).toHaveTextContent('Diagram ready')
    expect(screen.getByText('No structural issues in this subset.')).toBeInTheDocument()
    expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_InvoiceApproval')
    expect(modeler.xml).toContain('Process_InvoiceApproval')
  })

  it('AC-FLOW-5: Open BPMN is disabled until the diagram is ready', async () => {
    modelerState.importImpl = async () => {
      throw new Error('parser blew up')
    }
    await renderFailedImport()
    expect(screen.getByRole('button', { name: 'Open BPMN' })).toBeDisabled()
  })

  it('AC-FLOW-8 and AC-FLOW-9: New diagram and Invoice sample stay disabled until the modeler is ready', async () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'New diagram' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Invoice sample' })).toBeDisabled()
    expectNoPrompt()

    expect(await screen.findByRole('status')).toHaveTextContent('Diagram ready')
    expect(screen.getByRole('button', { name: 'New diagram' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Invoice sample' })).toBeEnabled()
    expectNoPrompt()
  })

  it('AC-FLOW-8 and AC-FLOW-9: the actions are named in the selected language', async () => {
    const { user } = await renderReady()
    expect(screen.getByRole('button', { name: 'New diagram' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invoice sample' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'PL' }))

    expect(screen.getByRole('button', { name: 'Nowy diagram' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Przykład faktury' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'New diagram' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invoice sample' })).not.toBeInTheDocument()
    expectNoPrompt()
  })

  it('AC-FLOW-8 and AC-SIM-1: New diagram imports a blank process without confirmation and ends simulation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const { user, modeler } = await renderReady()
    showSelection(modeler, 'Task_Validate', 'Clerk validation')
    modeler.history = { canUndo: true, canRedo: true }
    act(() => modeler.emit('commandStack.changed', {}))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dark theme' }))
    await user.click(screen.getByRole('button', { name: 'PL' }))
    await user.click(screen.getByRole('button', { name: 'Sprawdź' }))
    expect(
      await screen.findByText('Brak problemów strukturalnych w tym podzbiorze.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Nazwa/ })).toHaveValue('Clerk validation')
    modeler.canvas.zoom.mockClear()

    await user.click(screen.getByRole('button', { name: 'Nowy diagram' }))

    await waitFor(() => expect(modeler.importXML.mock.calls.length).toBeGreaterThan(1))
    expectBlankProcess(String(modeler.importXML.mock.lastCall?.[0]))
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(await screen.findByText('Jeszcze nie sprawdzono.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Nazwa/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cofnij' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ponów' })).toBeDisabled()
    expect(modeler.commandStack.undo).not.toHaveBeenCalled()
    expect(document.documentElement.lang).toBe('pl')
    expect(document.documentElement).toHaveClass('dark')
    expect(modeler.toggleMode._active).toBe(false)
    expect(screen.getByRole('button', { name: 'Symulacja' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zatrzymaj symulację' })).not.toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: 'Polecenie' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generuj diagram' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('AC-VAL-9: validating the blank process reports only a missing start and a missing end', async () => {
    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    await waitFor(() =>
      expect(String(activeModeler().importXML.mock.lastCall?.[0])).toContain('Process_Blank'),
    )

    await user.click(screen.getByRole('button', { name: 'Validate' }))

    expect(await screen.findByText('2 structural issues.')).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Structure check' })
    const findings = within(panel).getAllByRole('button')
    expect(findings.map((finding) => finding.textContent)).toEqual([
      'The process has no start event.',
      'The process has no end event.',
    ])
  })

  it('AC-FLOW-9 and AC-SIM-1: Invoice sample re-imports the bundled diagram, including when it is already open', async () => {
    const { user, modeler } = await renderReady()
    showSelection(modeler, 'Task_Validate', 'Clerk validation')
    modeler.history = { canUndo: true, canRedo: false }
    act(() => modeler.emit('commandStack.changed', {}))
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Clerk validation')
    modeler.canvas.zoom.mockClear()
    const importsBefore = modeler.importXML.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Invoice sample' }))

    await waitFor(() => expect(modeler.importXML).toHaveBeenCalledTimes(importsBefore + 1))
    const again = String(modeler.importXML.mock.lastCall?.[0])
    expect(again).toContain('Process_InvoiceApproval')
    expect(again).toContain('Clerk validation')
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(await screen.findByText('Not checked yet.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Name/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(modeler.toggleMode._active).toBe(false)
    expect(screen.getByRole('button', { name: 'Simulation' })).toBeInTheDocument()
    expectNoPrompt()

    await user.click(screen.getByRole('button', { name: 'Invoice sample' }))
    await waitFor(() => expect(modeler.importXML).toHaveBeenCalledTimes(importsBefore + 2))
    expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_InvoiceApproval')
  })

  it('AC-FLOW-4: download stays named invoice-approval.bpmn after New diagram and Invoice sample', async () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:invoice'
    })
    let download = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      download = this.download
    })

    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    await waitFor(() =>
      expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_Blank'),
    )
    await user.click(screen.getByRole('button', { name: 'Download BPMN' }))
    expect(download).toBe('invoice-approval.bpmn')
    await expect(blobs.at(-1)?.text()).resolves.toContain('Process_Blank')

    await user.click(screen.getByRole('button', { name: 'Invoice sample' }))
    await waitFor(() =>
      expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_InvoiceApproval'),
    )
    await user.click(screen.getByRole('button', { name: 'Download BPMN' }))
    expect(download).toBe('invoice-approval.bpmn')
    await expect(blobs.at(-1)?.text()).resolves.toContain('Process_InvoiceApproval')
  })

  it('AC-STATE-1: a model edit clears a previous validation result', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()

    act(() => {
      modeler.emit('commandStack.changed', {})
    })

    expect(screen.getByText('Not checked yet.')).toBeInTheDocument()
    expect(screen.queryByText('No structural issues in this subset.')).not.toBeInTheDocument()
  })

  it('AC-FLOW-4: downloads the XML currently returned by the modeler', async () => {
    const exported = '<?xml version="1.0"?><bpmn:definitions id="Exported"></bpmn:definitions>'
    modelerState.saveXml = exported
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:invoice'
    })
    let download = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      download = this.download
    })

    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'Download BPMN' }))

    expect(download).toBe('invoice-approval.bpmn')
    expect(blobs).toHaveLength(1)
    await expect(blobs[0]?.text()).resolves.toBe(exported)
  })

  it('AC-THEME-1: opens in the light theme with the sun selected', async () => {
    await renderReady()
    expect(document.documentElement).not.toHaveClass('dark')
    const theme = screen.getByRole('group', { name: 'Theme' })
    expect(within(theme).getByRole('button', { name: 'Light theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(theme).getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('AC-THEME-2: the moon selects the dark theme and the sun restores light', async () => {
    const { user } = await renderReady()
    const theme = screen.getByRole('group', { name: 'Theme' })
    await user.click(within(theme).getByRole('button', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(within(theme).getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(theme).getByRole('button', { name: 'Light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(within(theme).getByRole('button', { name: 'Light theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('AC-THEME-2: the theme options are named in the selected language', async () => {
    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'PL' }))
    const theme = screen.getByRole('group', { name: 'Motyw' })
    expect(within(theme).getByRole('button', { name: 'Jasny motyw' })).toBeInTheDocument()
    expect(within(theme).getByRole('button', { name: 'Ciemny motyw' })).toBeInTheDocument()
  })

  it('AC-THEME-3: changing the theme keeps the diagram, selection, and check result, and is independent of language', async () => {
    const { user, modeler } = await renderReady()
    const selected = {
      id: 'Task_Validate',
      type: 'bpmn:UserTask',
      businessObject: { name: 'Clerk validation' },
    }
    // Saving XML re-reads the modeler's selection, so the modeler must report it like bpmn-js does.
    modeler.selection.get.mockReturnValue([selected])
    act(() => {
      modeler.emit('selection.changed', { newSelection: [selected] })
    })
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    await screen.findByText('No structural issues in this subset.')
    const imports = modeler.importXML.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Dark theme' }))

    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(screen.getByDisplayValue('Clerk validation')).toBeInTheDocument()
    expect(screen.getByText('No structural issues in this subset.')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')

    await user.click(screen.getByRole('button', { name: 'PL' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.lang).toBe('pl')
  })

  it('AC-I18N-1: opens in English with EN selected', async () => {
    await renderReady()
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice approval')
    const language = screen.getByRole('group', { name: 'Language' })
    expect(within(language).getByRole('button', { name: 'EN' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(language).getByRole('button', { name: 'PL' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('AC-I18N-2: PL translates the interface and EN restores it', async () => {
    const { user, modeler } = await renderReady()
    act(() => {
      modeler.emit('selection.changed', {
        newSelection: [
          {
            id: 'Task_Validate',
            type: 'bpmn:UserTask',
            businessObject: { name: 'Clerk validation' },
          },
        ],
      })
    })
    expect(screen.getByText('User task')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'PL' }))

    expect(document.documentElement.lang).toBe('pl')
    expect(screen.getByRole('status')).toHaveTextContent('Diagram gotowy')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Zatwierdzanie faktury')
    expect(screen.getByRole('button', { name: 'Dopasuj' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nowy diagram' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Przykład faktury' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sprawdź' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pobierz BPMN' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kontrola struktury' })).toBeInTheDocument()
    expect(screen.getByText('Jeszcze nie sprawdzono.')).toBeInTheDocument()
    expect(screen.getByText('Zadanie użytkownika')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Nazwa/ })).toHaveValue('Clerk validation')
    expect(screen.getByText(/To nie jest walidacja schematu BPMN 2.0/)).toBeInTheDocument()
    expect(screen.queryByText('Diagram ready')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('status')).toHaveTextContent('Diagram ready')
    expect(screen.getByText('User task')).toBeInTheDocument()
    expect(screen.getByText('Not checked yet.')).toBeInTheDocument()
  })

  it('AC-I18N-2: findings, their count, and the missing-element message follow the language', async () => {
    modelerState.saveXml = brokenXml
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'PL' }))
    await user.click(screen.getByRole('button', { name: 'Sprawdź' }))

    expect(await screen.findByText('4 problemy strukturalne.')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Bramka wyłączna "Decyzja" (Gateway_Thin) ma 1 wychodzący przepływ sekwencji; wymagane są co najmniej 2.',
      }),
    )
    expect(modeler.selection.select).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'Gateway_Thin' }),
    )

    modelerState.missingIds.add('Task_Lone')
    await user.click(
      screen.getByRole('button', {
        name: 'Zadanie użytkownika "Osierocony krok" (Task_Lone) nie ma przychodzącego przepływu sekwencji.',
      }),
    )
    expect(
      screen.getByText('„Task_Lone” nie znajduje się na bieżącym diagramie.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByText('4 structural issues.')).toBeInTheDocument()
    expect(screen.getByText('"Task_Lone" is not on the current diagram.')).toBeInTheDocument()
  })

  it('AC-I18N-3: changing the language keeps the diagram, the selection, and the validation result', async () => {
    const { user, modeler } = await renderReady()
    const savesAfterOpen = modeler.saveXML.mock.calls.length
    const selected = {
      id: 'Task_Validate',
      type: 'bpmn:UserTask',
      businessObject: { name: 'Clerk validation' },
    }
    // Saving XML re-reads the modeler's selection, so the modeler must report it like bpmn-js does.
    modeler.selection.get.mockReturnValue([selected])
    act(() => {
      modeler.emit('selection.changed', { newSelection: [selected] })
    })
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesAfterOpen + 1)

    await user.click(screen.getByRole('button', { name: 'PL' }))

    expect(screen.getByText('Brak problemów strukturalnych w tym podzbiorze.')).toBeInTheDocument()
    expect(screen.getByText('Task_Validate')).toBeInTheDocument()
    expect(screen.getByText('Zadanie użytkownika')).toBeInTheDocument()
    expect(MockModeler.instances).toHaveLength(1)
    expect(modeler.importXML).toHaveBeenCalledTimes(1)
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesAfterOpen + 1)
    expect(modeler.destroy).not.toHaveBeenCalled()
  })

  it('AC-I18N-5: library and model text is shown as it is in Polish', async () => {
    modelerState.saveXml = '<definitions><process id="P">'
    modelerState.importImpl = async () => ({ warnings: [{ message: 'Render skipped a label.' }] })
    const { user } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'PL' }))

    expect(screen.getByText('Render skipped a label.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sprawdź' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The BPMN XML is not well-formed.')
  })

  it('AC-I18N-2: an import failure without a message uses the translated fallback', async () => {
    modelerState.importImpl = () => Promise.reject('boom')
    const { user } = await renderFailedImport()
    expect(screen.getByRole('alert')).toHaveTextContent('The diagram could not be opened.')

    await user.click(screen.getByRole('button', { name: 'PL' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się otworzyć diagramu.')
    expect(screen.getByRole('status')).toHaveTextContent('Nie udało się otworzyć diagramu')
  })

  it('AC-PROMPT-1: the Prompt is only on a blank process', async () => {
    const { user, modeler } = await renderReady()
    expectNoPrompt()

    const canvas = screen.getByRole('region', { name: 'Diagram canvas' })
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    await waitFor(() => expect(modeler.importXML.mock.calls.length).toBeGreaterThan(1))
    const prompt = await within(canvas).findByRole('textbox', { name: 'Prompt' })
    expect(prompt.tagName).toBe('INPUT')
    expect(screen.getByRole('button', { name: 'Generate diagram' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile(brokenXml, 'nodes.bpmn'))
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument(),
    )

    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile(BLANK_PROCESS_XML, 'blank.bpmn'))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toBeInTheDocument()

    const savesBeforeEdit = modeler.saveXML.mock.calls.length
    // The saved XML still describes a blank process. Blankness follows the modeler.
    modelerState.saveXml = BLANK_PROCESS_XML
    modeler.definitions = processDiagram(['bpmn:SequenceFlow'])
    modeler.history = { canUndo: true, canRedo: false }
    act(() => modeler.emit('commandStack.changed', {}))
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument(),
    )
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesBeforeEdit)

    modeler.definitions = processDiagram([])
    modelerState.saveXml = drawnNodeXml
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toBeInTheDocument()
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesBeforeEdit)

    modeler.definitions = processDiagram(['bpmn:StartEvent'])
    modelerState.saveXml = BLANK_PROCESS_XML
    act(() => modeler.emit('commandStack.changed', {}))
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument(),
    )
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesBeforeEdit)

    modeler.definitions = processDiagram([])
    act(() => modeler.emit('commandStack.changed', {}))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toBeInTheDocument()

    modeler.definitions = {
      rootElements: [
        { $type: 'bpmn:Process', flowElements: [] },
        { $type: 'bpmn:Process', flowElements: [] },
      ],
    }
    modelerState.saveXml = BLANK_PROCESS_XML
    act(() => modeler.emit('commandStack.changed', {}))
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument(),
    )
    expect(modeler.saveXML).toHaveBeenCalledTimes(savesBeforeEdit)
  })

  it('AC-PROMPT-1: the prompt bar stays to the right of a two-column palette', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8')
    const rule = css.match(/\.prompt-bar\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('right:')
    expect(rule).not.toContain('left:')
    expect(rule).toContain('106px')
  })

  it('AC-PROMPT-2: an empty or whitespace Prompt does not submit', async () => {
    const { user } = await renderReady()
    const { modeler, prompt } = await openBlank(user)
    const imports = modeler.importXML.mock.calls.length

    expect(screen.getByRole('button', { name: 'Generate diagram' })).toBeDisabled()
    await user.type(prompt, '   ')
    expect(screen.getByRole('button', { name: 'Generate diagram' })).toBeDisabled()
    await user.keyboard('{Enter}')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(modeler.xml).toContain('Process_Blank')
  })

  it('AC-PROMPT-3 and AC-PROMPT-4: prepared prompts import the legal-document flowchart and it validates', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    const prompt = await screen.findByRole('textbox', { name: 'Prompt' })
    await user.type(prompt, `  ${ENGLISH_PROMPT.toUpperCase()}  {Enter}`)

    await waitFor(() =>
      expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_LegalDocuments'),
    )
    const englishXml = String(modeler.importXML.mock.lastCall?.[0])
    expectPreparedXml(englishXml, 'en')
    expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    const again = await screen.findByRole('textbox', { name: 'Prompt' })
    await user.type(again, `  Wygeneruj Diagram Dla Obiegu Dokumentów Prawnych  `)
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))

    await waitFor(() =>
      expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Przyjmij dokument'),
    )
    expectPreparedXml(String(modeler.importXML.mock.lastCall?.[0]), 'pl')
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('No structural issues in this subset.')).toBeInTheDocument()
  })

  it('AC-PROMPT-5: an unprepared Prompt keeps the blank process, the check, and simulation', async () => {
    const { user } = await renderReady()
    const { modeler, prompt } = await openBlank(user)
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('2 structural issues.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    const imports = modeler.importXML.mock.calls.length

    await user.type(prompt, 'generate a diagram for the legal document workflow')
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This build has no live language model.',
    )
    expect(prompt).toHaveValue('generate a diagram for the legal document workflow')
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(modeler.xml).toContain('Process_Blank')
    expect(screen.getByText('2 structural issues.')).toBeInTheDocument()
    expect(screen.getByText('The process has no start event.')).toBeInTheDocument()
    expect(modeler.toggleMode._active).toBe(true)
    expect(screen.getByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()

    await user.clear(prompt)
    await user.type(prompt, 'generate  a diagram for a legal document workflow')
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))
    expect(screen.getByRole('alert')).toHaveTextContent('This build has no live language model.')
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)

    await user.click(screen.getByRole('button', { name: 'PL' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ta wersja nie ma żywego modelu językowego.',
    )
    expect(screen.getByRole('textbox', { name: 'Polecenie' })).toHaveValue(
      'generate  a diagram for a legal document workflow',
    )
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(modeler.toggleMode._active).toBe(true)
  })

  it('AC-PROMPT-6: a prepared prompt replaces the blank process like Open BPMN and ends simulation', async () => {
    const { user, modeler } = await renderReady()
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    const prompt = await screen.findByRole('textbox', { name: 'Prompt' })
    showSelection(modeler, 'Task_Validate', 'Clerk validation')
    modeler.history = { canUndo: true, canRedo: true }
    act(() => modeler.emit('commandStack.changed', {}))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Simulation' }))
    expect(await screen.findByRole('button', { name: 'Stop simulation' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Validate' }))
    expect(await screen.findByText('2 structural issues.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Clerk validation')
    modeler.canvas.zoom.mockClear()

    await user.type(prompt, ENGLISH_PROMPT)
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))

    await waitFor(() =>
      expect(String(modeler.importXML.mock.lastCall?.[0])).toContain('Process_LegalDocuments'),
    )
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(await screen.findByText('Not checked yet.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Name/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(modeler.toggleMode._active).toBe(false)
    expect(screen.getByRole('button', { name: 'Simulation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop simulation' })).not.toBeInTheDocument()
  })

  it('AC-PROMPT-7: language and theme keep the draft and do not re-import or translate names', async () => {
    const { user } = await renderReady()
    const { modeler, prompt } = await openBlank(user)
    await user.type(prompt, 'not yet')
    const imports = modeler.importXML.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'PL' }))
    expect(screen.getByRole('textbox', { name: 'Polecenie' })).toHaveValue('not yet')
    await user.click(screen.getByRole('button', { name: 'Ciemny motyw' }))
    expect(screen.getByRole('textbox', { name: 'Polecenie' })).toHaveValue('not yet')
    expect(modeler.importXML).toHaveBeenCalledTimes(imports)
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'EN' }))
    await user.clear(screen.getByRole('textbox', { name: 'Prompt' }))
    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), POLISH_PROMPT)
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))
    await waitFor(() => expect(modeler.xml).toContain('Przyjmij dokument'))
    const importsAfter = modeler.importXML.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'PL' }))
    expect(modeler.importXML).toHaveBeenCalledTimes(importsAfter)
    expect(modeler.xml).toContain('Przyjmij dokument')
    expect(modeler.xml).toContain('Obieg dokumentów prawnych')
    expect(modeler.xml).not.toContain('Receive document')
  })

  it('AC-PROMPT-7: New, Open, Invoice sample, and a successful generation clear the draft', async () => {
    const { user } = await renderReady()
    const { modeler, prompt } = await openBlank(user)
    await user.type(prompt, 'keep me')
    await user.click(screen.getByRole('button', { name: 'New diagram' }))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'keep me')
    await user.upload(screen.getByLabelText('BPMN file'), bpmnFile(BLANK_PROCESS_XML, 'blank.bpmn'))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), 'keep me')
    await user.click(screen.getByRole('button', { name: 'Invoice sample' }))
    await waitFor(() => expect(modeler.xml).toContain('Process_InvoiceApproval'))
    expectNoPrompt()
    modeler.definitions = processDiagram([])
    modelerState.saveXml = drawnNodeXml
    act(() => modeler.emit('commandStack.changed', {}))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Prompt' }), ENGLISH_PROMPT)
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))
    await waitFor(() => expect(modeler.xml).toContain('Process_LegalDocuments'))
    modeler.definitions = processDiagram([])
    modelerState.saveXml = drawnNodeXml
    act(() => modeler.emit('commandStack.changed', {}))
    expect(await screen.findByRole('textbox', { name: 'Prompt' })).toHaveValue('')
  })

  it('AC-PROMPT-8: download keeps invoice-approval.bpmn and generation does not call the network', async () => {
    const fetchSpy = vi.fn()
    const originalFetch = globalThis.fetch
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:legal'
    })
    let download = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      download = this.download
    })

    const { user } = await renderReady()
    expect(
      screen.queryByRole('textbox', { name: /api key|session key|klucz/i }),
    ).not.toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeNull()
    const { modeler, prompt } = await openBlank(user)
    await user.type(prompt, ENGLISH_PROMPT)
    await user.click(screen.getByRole('button', { name: 'Generate diagram' }))
    await waitFor(() => expect(modeler.xml).toContain('Receive document'))

    await user.click(screen.getByRole('button', { name: 'Download BPMN' }))
    expect(download).toBe('invoice-approval.bpmn')
    await expect(blobs.at(-1)?.text()).resolves.toContain('Process_LegalDocuments')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('textbox', { name: /api key|session key|klucz/i }),
    ).not.toBeInTheDocument()

    openSpy.mockRestore()
    if (originalFetch) vi.stubGlobal('fetch', originalFetch)
    else vi.unstubAllGlobals()
  })
})
