import { describe, expect, it } from 'vitest'
import { BpmnParseError, parseBpmnXml } from './parseBpmnXml'

function prefixed(processBody: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_Prefixed" name=" Prefixed ">
    ${processBody}
  </bpmn:process>
</bpmn:definitions>`
}

function plain(processBody: string, processId = 'Process_Plain'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="${processId}">
    ${processBody}
  </process>
</definitions>`
}

const connected = `
  <startEvent id="Start_1" name=" Start " />
  <endEvent id="End_1" />
  <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="End_1" />
`

describe('parseBpmnXml', () => {
  it('AC-PARSE-1: reads prefixed and default-namespace BPMN into the same subset', () => {
    const fromPrefix = parseBpmnXml(
      prefixed(
        connected
          .replaceAll('startEvent', 'bpmn:startEvent')
          .replaceAll('endEvent', 'bpmn:endEvent')
          .replaceAll('sequenceFlow', 'bpmn:sequenceFlow'),
      ),
    )
    const fromDefault = parseBpmnXml(plain(connected))

    expect(fromPrefix).toMatchObject({
      id: 'Process_Prefixed',
      name: 'Prefixed',
      nodes: [
        { id: 'Start_1', type: 'startEvent', name: 'Start' },
        { id: 'End_1', type: 'endEvent' },
      ],
      flows: [{ id: 'Flow_1', sourceId: 'Start_1', targetId: 'End_1' }],
    })
    expect(fromDefault.nodes.map((node) => node.type)).toEqual(['startEvent', 'endEvent'])
    expect(fromDefault.flows).toEqual([{ id: 'Flow_1', sourceId: 'Start_1', targetId: 'End_1' }])
  })

  it('AC-PARSE-2: rejects empty and malformed XML with a readable error', () => {
    expect(() => parseBpmnXml('')).toThrow(BpmnParseError)
    expect(() => parseBpmnXml('   ')).toThrow('The BPMN XML is empty.')
    expect(() => parseBpmnXml('<definitions><process id="P">')).toThrow(
      'The BPMN XML is not well-formed.',
    )
    expect(() => parseBpmnXml('this is not xml')).toThrow(BpmnParseError)
  })

  it('AC-PARSE-3: rejects a document that has no process', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <collaboration id="Collaboration_1" />
</definitions>`
    expect(() => parseBpmnXml(xml)).toThrow('The document does not contain a BPMN process.')
  })

  it('AC-PARSE-4: rejects a sequence flow missing its id or refs', () => {
    expect(() => parseBpmnXml(plain('<sequenceFlow sourceRef="A" targetRef="B" />'))).toThrow(
      'A sequence flow is missing an id.',
    )
    expect(() => parseBpmnXml(plain('<sequenceFlow id="Flow_1" targetRef="B" />'))).toThrow(
      'Sequence flow "Flow_1" is missing sourceRef or targetRef.',
    )
  })

  it('AC-PARSE-5: rejects a flow node or process missing an id, and duplicate ids', () => {
    expect(() => parseBpmnXml(plain('<userTask name="Nameless" />'))).toThrow(
      'A userTask element is missing an id.',
    )
    expect(() =>
      parseBpmnXml(`<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process><startEvent id="Start_1" /></process>
</definitions>`),
    ).toThrow('The BPMN process is missing an id.')
    expect(() =>
      parseBpmnXml(plain('<startEvent id="Start_1" /><endEvent id="Start_1" />')),
    ).toThrow('Duplicate BPMN id "Start_1".')
  })

  it('uses the first process and ignores nodes nested in a sub-process', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="Process_First">
    <startEvent id="Start_1" />
    <subProcess id="Sub_1">
      <userTask id="Task_Hidden" name="Hidden" />
    </subProcess>
    <endEvent id="End_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Sub_1" />
    <sequenceFlow id="Flow_2" sourceRef="Sub_1" targetRef="End_1" />
  </process>
  <process id="Process_Second">
    <userTask id="Task_Other" />
  </process>
</definitions>`

    const model = parseBpmnXml(xml)
    expect(model.id).toBe('Process_First')
    expect(model.nodes.map((node) => node.id)).toEqual(['Start_1', 'Sub_1', 'End_1'])
    expect(model.flows).toHaveLength(2)
  })
})
