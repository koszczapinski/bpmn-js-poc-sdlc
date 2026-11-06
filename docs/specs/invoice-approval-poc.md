# Invoice approval proof of concept

## Purpose

Show a real BPMN 2.0 invoice-approval diagram in bpmn-js, inspect the selected element, run a small structural check, and download the current XML. The interface is available in English (default) and Polish; the bundled diagram is English.

A passing check does **not** mean the document is valid BPMN 2.0, executable, or free of modeling mistakes outside the rules below. The bundled sample is marked `isExecutable="false"`. This app never runs the process.

## Invoice flow

The bundled file is `src/bpmn/invoiceApproval.bpmn`, process `Process_InvoiceApproval` ("Invoice approval").

| Step                   | Id                    | Element           | Name                  |
| ---------------------- | --------------------- | ----------------- | --------------------- |
| Invoice received       | `Start_Received`      | start event       | Invoice received      |
| Clerk validation       | `Task_Validate`       | user task         | Clerk validation      |
| Valid?                 | `Gateway_Valid`       | exclusive gateway | Valid?                |
| Ask for clarification  | `Task_Clarify`        | user task         | Request clarification |
| Amount over 1,000 PLN? | `Gateway_Amount`      | exclusive gateway | Amount > 1000 PLN?    |
| Auto approve           | `Task_AutoApprove`    | service task      | Automatic approval    |
| Manager approval       | `Task_ManagerApprove` | user task         | Manager approval      |
| Archive                | `Task_Archive`        | service task      | Archive invoice       |
| End                    | `End_Archived`        | end event         | End                   |

Sequence flows:

- `Start_Received` → `Task_Validate` → `Gateway_Valid`
- `Gateway_Valid` — Yes → `Gateway_Amount` (default)
- `Gateway_Valid` — No → `Task_Clarify` → back to `Task_Validate`
- `Gateway_Amount` — ≤ 1000 PLN → `Task_AutoApprove` (default)
- `Gateway_Amount` — > 1000 PLN → `Task_ManagerApprove`
- `Task_AutoApprove` and `Task_ManagerApprove` → `Task_Archive` → `End_Archived`

Automatic approval and archive are service tasks because no person performs them. Clerk validation, clarification, and manager approval are user tasks. There is no joining gateway: both approval paths connect directly to archive. A one-outgoing exclusive join would fail AC-VAL-5 even though it is normal BPMN.

## Acceptance criteria

### Diagram

**AC-FLOW-1.** Given the bundled XML, when it is parsed, then the process id, name, nodes, and sequence flows match the table above, `isExecutable` is false, the non-default flows carry the `invoiceValid == false` and `amount > 1000` conditions, and every label in the diagram is English (the interface language never changes the diagram).

**AC-FLOW-2.** Given the app has just opened, when the modeler finishes starting, then it has imported that same XML and fitted the viewport. The bundled XML is only the starting diagram; opening a file later replaces it (AC-FLOW-5).

**AC-FLOW-3.** Given a selected element, when the panel renders, then it shows the id, a readable type, and the name from the modeler event. Given the user commits a new name with Enter or by leaving the field, when the modeler is updated, then `modeling.updateProperties` is called with that id and name. The panel does not keep its own copy of that name; it changes when `element.changed` reports the modeler's element. A label selection follows the label's target element.

**AC-FLOW-4.** Given the modeler can save XML, when the user downloads, then the browser is given a file named `invoice-approval.bpmn` whose contents are the XML returned by the modeler at that moment. The download is not kept as a second diagram.

**AC-FLOW-5.** Given the diagram is ready, when the user chooses a local file with Open BPMN, then the file's text is imported into the modeler, the new diagram replaces the current one, and the viewport is fitted. The selection is cleared, a shown check result is cleared and the panel says `Not checked yet.`, and Undo and Redo are disabled because the opened file starts a new history. Choosing the same file twice opens it twice. Download (AC-FLOW-4) still returns whatever the modeler holds, under the name `invoice-approval.bpmn`.

**AC-FLOW-6.** Given the user chooses a file the modeler rejects, when the import fails, then an alert shows the error message, the diagram that was open keeps its content, and the check result is not cleared. The edit history may be reset by the failed open.

**AC-FLOW-7.** Given the diagram is ready, when the toolbar renders, then it has Undo and Redo buttons. Each is enabled only when the modeler's command stack has something to undo or redo, and that is read again whenever the modeler emits `commandStack.changed` and after an import. Given the user clicks Undo or Redo, when the modeler is updated, then the command stack is asked to undo or redo once, and the selection panel follows the modeler's `element.changed` event. The panel keeps no copy of the history.

**AC-STATE-1.** Given Validate has reported a result, when the modeler emits `commandStack.changed` because the diagram was edited (including undo and redo), or a file is opened (AC-FLOW-5), then that result is cleared and the panel says `Not checked yet.` Findings are a check of the modeler at one moment, not a stored process model.

### Validation

The validator receives the parsed model, not XML and not a bpmn-js element. The finding texts quoted below are the English `message` of each finding; the UI shows the same finding in the selected language (AC-I18N-5).

**AC-VAL-1.** Given a process with no start event, when it is validated, then one finding says `The process has no start event.` and does not point at an element id.

**AC-VAL-2.** Given a process with no end event, when it is validated, then one finding says `The process has no end event.`

**AC-VAL-3.** Given a flow node that is not a start event and has no incoming sequence flow, when it is validated, then a finding names that node and says it has no incoming sequence flow.

**AC-VAL-4.** Given a flow node that is not an end event and has no outgoing sequence flow, when it is validated, then a finding names that node and says it has no outgoing sequence flow. A start event with no outgoing flow is included.

**AC-VAL-5.** Given an exclusive gateway with fewer than two outgoing sequence flows, when it is validated, then a finding states the count and that at least two are required. A parallel gateway is not subject to this rule. Zero outgoing flows also produces AC-VAL-4.

**AC-VAL-6.** Given the bundled invoice process, when it is validated, then there are no findings. Given that same XML is what the modeler returns, when the user clicks Validate, then the panel says `No structural issues in this subset.`

**AC-VAL-7.** Given validation returned a finding with an element id, when the user activates that finding, then the modeler selects that id, adds the `validation-focus` marker, and scrolls to it. Given the id is not on the canvas, when the finding is activated, then the panel says the element is not on the current diagram and does not select anything. A process-level finding selects nothing.

**AC-VAL-8.** Given the structure panel is visible, when the user has or has not run Validate, then the panel states that the rules are not a BPMN 2.0 schema check or a process engine. A pass never implies full BPMN compliance or executability.

### XML adapter

**AC-PARSE-1.** Given well-formed BPMN that uses the BPMN namespace as a prefix or as the default namespace, when it is parsed, then the model contains the same nodes and sequence flows. Names are trimmed. A blank name is omitted.

**AC-PARSE-2.** Given empty text or XML that is not well-formed, when it is parsed, then a `BpmnParseError` explains that the XML is empty or not well-formed.

**AC-PARSE-3.** Given well-formed XML with no `process` element, when it is parsed, then a `BpmnParseError` says the document does not contain a BPMN process.

**AC-PARSE-4.** Given a sequence flow missing `id`, `sourceRef`, or `targetRef`, when it is parsed, then a `BpmnParseError` names the missing part.

**AC-PARSE-5.** Given a flow node or the process missing `id`, or a repeated id, when it is parsed, then a `BpmnParseError` says so.

**AC-PARSE-6.** Given the modeler returns XML the adapter rejects, when the user clicks Validate, then the panel shows that parser message and does not show a pass.

The adapter uses the first `process` only. It does not walk inside a sub-process. It ignores `incoming` and `outgoing` children and builds the graph from `sequenceFlow` `sourceRef` and `targetRef`. Unknown element types are skipped rather than treated as flow nodes.

### Interface language

The interface has two languages: English (`en`, default) and Polish (`pl`). The selected language is UI state held by React for the current page only; it is not stored and a reload returns to English. Names inside the diagram are model data and are never translated.

**AC-I18N-1.** Given the app has just opened, when it renders, then every interface text is English, the language switch shows English as selected, and `<html lang>` is `en`. The app never selects Polish on its own.

**AC-I18N-2.** Given the user selects PL in the language switch, when the interface re-renders, then the header, status line, toolbar buttons, canvas caption, selection panel (including element type labels), structure-check panel (rules note, idle, running and error states, finding count and finding texts), and the "not on the current diagram" message are Polish, and `<html lang>` is `pl`. Selecting EN restores English.

**AC-I18N-3.** Given a diagram is open, when the user changes the language, then the modeler is not re-imported, the selection is unchanged, and a validation result that is already shown stays shown and is re-rendered in the new language. Findings are translated from their code and parameters; Validate is not run again.

**AC-I18N-4.** Given the English and Polish dictionaries, when they are compared, then both define the same keys and use the same `{placeholders}` for each key, and counts use the plural forms of the selected language (Polish: one, few, many). Given a finding, then its English interface text equals the English `message` the domain produced.

**AC-I18N-5.** Given validation produced a finding, then the finding carries its `code` and the values its sentence is built from (`params`: `nodeType`, `nodeId`, and when present `nodeName` and `count`) next to the English `message`. The UI builds the displayed sentence from code and params, so `src/domain` needs no translation code. Texts that are model data or come from a library are shown as they are: element names, bpmn-js canvas and context-pad labels, bpmn-js import notes, and parser error messages (AC-PARSE-\*).

### UI states

**AC-UI-1.** Given the diagram has not imported yet, when the app renders, then a status says `Opening the invoice diagram…`.

**AC-UI-2.** Given import fails, when the error is caught, then a status says the diagram could not be opened and an alert shows the error message.

**AC-ARCH-1.** Given the source tree, when the architecture test reads it, then `src/domain` has no React, bpmn-js, diagram-js, `src/i18n`, or DOM parser usage, `DOMParser` appears only in the XML adapter, and bpmn-js imports appear only in the modeler adapter and `src/main.tsx`.
