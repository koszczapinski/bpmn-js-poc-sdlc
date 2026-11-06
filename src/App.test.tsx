import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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

  class MockModeler {
    static instances: MockModeler[] = []
    xml = ''
    private readonly listeners = new Map<string, Set<Listener>>()
    importXML = vi.fn(async (xml: string) => {
      this.xml = xml
      const result = await modelerState.importImpl(xml)
      return { warnings: result.warnings ?? [] }
    })
    saveXML = vi.fn(async () => ({ xml: modelerState.saveXml ?? this.xml }))
    destroy = vi.fn()
    selection = { select: vi.fn() }
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
        return { id, type: 'bpmn:UserTask', businessObject: { name: 'Element' } }
      }),
    }
    modeling = { updateProperties: vi.fn() }

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
      throw new Error(`Unexpected service ${service}`)
    }

    emit(event: string, payload: unknown) {
      for (const callback of this.listeners.get(event) ?? []) callback(payload)
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
    expect(xml).toContain('Walidacja przez referenta')
    expect(xml).toContain('Gateway_Amount')
    expect(modeler.canvas.zoom).toHaveBeenCalledWith('fit-viewport')
    expect(screen.getByText(/Not a BPMN 2.0 schema check or a process engine/)).toBeInTheDocument()
    expect(screen.getByText('Not checked yet.')).toBeInTheDocument()
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
})
