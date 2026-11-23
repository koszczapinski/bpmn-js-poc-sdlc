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

**AC-FLOW-2.** Given the app has just opened, when the modeler finishes starting, then it has imported that same XML and fitted the viewport. There is no Prompt field on the invoice diagram. The bundled XML is only the starting diagram; opening a file later replaces it (AC-FLOW-5), New diagram replaces it with a blank process (AC-FLOW-8), and Invoice sample imports it again (AC-FLOW-9).

**AC-FLOW-3.** Given a selected element, when the panel renders, then it shows the id, a readable type, and the name from the modeler event. Given the user commits a new name with Enter or by leaving the field, when the modeler is updated, then `modeling.updateProperties` is called with that id and name. The panel does not keep its own copy of that name; it changes when `element.changed` reports the modeler's element. A label selection follows the label's target element.

**AC-FLOW-4.** Given the modeler can save XML, when the user downloads, then the browser is given a file named `invoice-approval.bpmn` whose contents are the XML returned by the modeler at that moment. The download is not kept as a second diagram. The name stays `invoice-approval.bpmn` after New diagram, after Invoice sample, and after a prepared prompt fills the diagram (AC-PROMPT-8).

**AC-FLOW-5.** Given the diagram is ready, when the user chooses a local file with Open BPMN, then the file's text is imported into the modeler, the new diagram replaces the current one, and the viewport is fitted. The selection is cleared, a shown check result is cleared and the panel says `Not checked yet.`, and Undo and Redo are disabled because the opened file starts a new history. Choosing the same file twice opens it twice. Download (AC-FLOW-4) still returns whatever the modeler holds, under the name `invoice-approval.bpmn`. Open BPMN clears any in-progress Prompt draft. A blank document shows the Prompt; a document with a flow node or a sequence flow does not (AC-PROMPT-1, AC-PROMPT-7).

**AC-FLOW-6.** Given the user chooses a file the modeler rejects, when the import fails, then an alert shows the error message, the diagram that was open keeps its content, and the check result is not cleared. The edit history may be reset by the failed open.

**AC-FLOW-7.** Given the diagram is ready, when the toolbar renders, then it has Undo and Redo buttons. Each is enabled only when the modeler's command stack has something to undo or redo, and that is read again whenever the modeler emits `commandStack.changed` and after an import. Given the user clicks Undo or Redo, when the modeler is updated, then the command stack is asked to undo or redo once, and the selection panel follows the modeler's `element.changed` event. The panel keeps no copy of the history.

**AC-FLOW-8.** Given the modeler is not ready, when the toolbar renders, then New diagram is disabled. Given the diagram is ready, when the toolbar renders, then New diagram is enabled, beside Open BPMN. The label is `New diagram` in English and `Nowy diagram` in Polish. Given the user chooses New diagram, even when the open diagram has edits, then the modeler imports a blank process without asking for confirmation. The blank process is one process, `Process_Blank`, with `isExecutable` false and an empty diagram plane: no flow nodes, no sequence flows, no start event, and no shapes or edges. The viewport is fitted. The selection is cleared. A shown check result is cleared and the panel says `Not checked yet.` Undo and Redo are disabled because the import starts a new history, so Undo cannot restore the previous diagram. The interface language and the theme stay. Token simulation ends (AC-SIM-1). The Prompt is shown on that blank process (AC-PROMPT-1), and New diagram clears any in-progress Prompt draft (AC-PROMPT-7).

**AC-FLOW-9.** Given the modeler is not ready, when the toolbar renders, then Invoice sample is disabled. Given the diagram is ready, when the toolbar renders, then Invoice sample is enabled, beside Open BPMN. The label is `Invoice sample` in English and `Przykład faktury` in Polish. Given the user chooses Invoice sample, then the modeler re-imports the bundled invoice flowchart the same way Open BPMN imports a file: the viewport is fitted, the selection is cleared, a shown check result is cleared and the panel says `Not checked yet.`, undo history starts over, and token simulation ends. Choosing Invoice sample while that diagram is already open imports it again. The Prompt is hidden, and Invoice sample clears any in-progress Prompt draft (AC-PROMPT-7).

**AC-STATE-1.** Given Validate has reported a result, when the modeler emits `commandStack.changed` because the diagram was edited (including undo and redo), or a file is opened (AC-FLOW-5), or New diagram or Invoice sample imports a diagram (AC-FLOW-8, AC-FLOW-9), or a prepared prompt imports a flowchart (AC-PROMPT-6), then that result is cleared and the panel says `Not checked yet.` A prompt that is not prepared does not clear it (AC-PROMPT-5). Findings are a check of the modeler at one moment, not a stored process model.

### Prepared prompt

On a blank process the Prompt is a single-line field and a submit button, placed with the diagram and not in a dialog. It does not cover the palette. Blank means the modeler document has exactly one process and that process has no flow nodes and no sequence flows. React may remember the in-progress draft and whether the process is blank. It refreshes blankness from the modeler after import and after `commandStack.changed`. It does not keep a copy of the BPMN model.

The language model in this slice is a fixture. There is no network call, no API key, and no key field. After trim, case is ignored and internal spaces matter. The only prepared prompts are `wygeneruj diagram dla obiegu dokumentów prawnych` and `generate a diagram for a legal document workflow`. Each imports one fixed BPMN document. Both documents share one shape and one set of ids. Names follow the sentence. `isExecutable` is false. No sequence flow has a condition. `Flow_Accepted` is the default. Every flow node has a shape and every sequence flow has an edge.

| Step     | Id                     | Element           | Polish name         | English name      |
| -------- | ---------------------- | ----------------- | ------------------- | ----------------- |
| Start    | `Start_Legal`          | start event       | (unnamed)           | (unnamed)         |
| Receive  | `Task_ReceiveDocument` | user task         | Przyjmij dokument   | Receive document  |
| Review   | `Task_ReviewDocument`  | user task         | Zweryfikuj dokument | Review document   |
| Decision | `Gateway_Accepted`     | exclusive gateway | Przyjęty?           | Accepted?         |
| File     | `Task_FileDocument`    | service task      | Złóż do akt         | File the document |
| Filed    | `End_Filed`            | end event         | Złożony             | Filed             |
| Return   | `Task_ReturnToAuthor`  | user task         | Zwróć autorowi      | Return to author  |
| Returned | `End_Returned`         | end event         | Zwrócony            | Returned          |

The process id is `Process_LegalDocuments`, named `Obieg dokumentów prawnych` or `Legal document workflow`. Sequence flows are `Flow_ToReceive`, `Flow_ToReview`, `Flow_ToGateway`, `Flow_Accepted` (`Tak` or `Yes`, the default), `Flow_ToFiled`, `Flow_Rejected` (`Nie` or `No`), and `Flow_ToReturned`. Zeebe form ids are `receive-legal-document`, `review-legal-document`, and `return-legal-document`. The service task's Zeebe job type is `file-legal-document`. Those identifiers do not follow the interface language.

Before import, a document the modeler cannot import, that does not contain exactly one process, or that lacks a shape for a flow node or an edge for a sequence flow, is refused. The blank process stays, and the error uses the same alert as a failed open. The shipped documents pass this gate.

**AC-PROMPT-1.** Given the invoice diagram, when it is shown, then the Prompt is absent. Given a blank process from New diagram, from Open BPMN of a blank document, or after undo or delete returns the saved document to blank, when the modeler reports that import or `commandStack.changed`, then the Prompt is present. Given a file with a flow node, the first drawn flow node, or a successful generation, then the Prompt is hidden. The Prompt is a single-line field labeled `Prompt` (`Polecenie` in Polish) and a submit button labeled `Generate diagram` (`Generuj diagram` in Polish). It sits in the diagram region, not in a dialog, and it does not cover the palette.

**AC-PROMPT-2.** Given a blank process, when the Prompt is empty or only whitespace, then Generate diagram is disabled. Submitting it, including with Enter, does not import, does not alert, and leaves the blank process unchanged.

**AC-PROMPT-3.** Given a blank process, when the user submits either prepared prompt, including different case and surrounding spaces, then the modeler imports the flowchart for that sentence. The imported XML has exactly one process, the shared ids, `isExecutable="false"`, the language-specific names, `Flow_Accepted` as the default, no sequence-flow condition, a shape for every flow node, an edge for every sequence flow, the Zeebe form ids, and the Zeebe job type. A paraphrase, or the same words with different internal spacing, is not that prompt (AC-PROMPT-5).

**AC-PROMPT-4.** Given that generated flowchart is what the modeler returns, when the user clicks Validate, then the panel says `No structural issues in this subset.` Validating the blank process still reports only a missing start and a missing end (AC-VAL-9).

**AC-PROMPT-5.** Given a blank process, a shown structural check, and token simulation on, when the user submits a paraphrase or any other non-empty text that is not a prepared prompt, then the blank process stays, the shown check stays, the toolbar still shows Stop simulation, and an alert says `This build has no live language model.` Switching the interface language rewords that alert to `Ta wersja nie ma żywego modelu językowego.` without importing again.

**AC-PROMPT-6.** Given a prepared prompt is submitted, when the import succeeds, then the Prompt is hidden, the selection is cleared, a shown check is cleared and the panel says `Not checked yet.`, Undo and Redo are disabled because history starts over, the viewport is fitted, and token simulation ends.

**AC-PROMPT-7.** Given text in the Prompt, when the user switches interface language or theme, then the draft stays, the modeler is not imported again, and names already in the diagram stay as the XML wrote them. New diagram, Open BPMN, Invoice sample, and a successful generation clear the draft. A refused prompt does not.

**AC-PROMPT-8.** Given the generated flowchart, when the user downloads, then the file is named `invoice-approval.bpmn`. There is no API-key field. Generation does not call the network.

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

**AC-VAL-9.** Given the blank process from New diagram is what the modeler returns, when the user clicks Validate, then the only findings are a missing start (`The process has no start event.`) and a missing end (`The process has no end event.`).

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

**AC-I18N-2.** Given the user selects PL in the language switch, when the interface re-renders, then the header, status line, toolbar buttons, canvas caption, selection panel (including element type labels), structure-check panel (rules note, idle, running and error states, finding count and finding texts), the "not on the current diagram" message, and, on a blank process, the Prompt label and its submit button are Polish, and `<html lang>` is `pl`. Selecting EN restores English.

**AC-I18N-3.** Given a diagram is open, when the user changes the language, then the modeler is not re-imported, the selection is unchanged, a validation result that is already shown stays shown and is re-rendered in the new language, and an in-progress Prompt draft stays. Findings are translated from their code and parameters; Validate is not run again. Diagram names are not translated.

**AC-I18N-4.** Given the English and Polish dictionaries, when they are compared, then both define the same keys and use the same `{placeholders}` for each key, and counts use the plural forms of the selected language (Polish: one, few, many). Given a finding, then its English interface text equals the English `message` the domain produced.

**AC-I18N-5.** Given validation produced a finding, then the finding carries its `code` and the values its sentence is built from (`params`: `nodeType`, `nodeId`, and when present `nodeName` and `count`) next to the English `message`. The UI builds the displayed sentence from code and params, so `src/domain` needs no translation code. Texts that are model data or come from a library are shown as they are: element names, bpmn-js canvas and context-pad labels, bpmn-js import notes, and parser error messages (AC-PARSE-\*).

### Interface theme

The interface is built from shadcn/ui components and has two themes: light (default) and dark. The selected theme is UI state held by React for the current page only; it is not stored, the browser's colour-scheme preference is not read, and a reload returns to light. The theme styles the interface only. The diagram, its XML, and the bpmn-js canvas styling are not affected.

**AC-THEME-1.** Given the app has just opened, when it renders, then the theme is light: `<html>` does not carry the `dark` class, and the theme switch shows the sun option as selected. The app never selects dark on its own.

**AC-THEME-2.** Given the theme switch with a sun and a moon option, when the user selects the moon, then `<html>` carries the `dark` class and the moon option is selected; when the user selects the sun, then the `dark` class is removed and the sun option is selected. Each option has an accessible name in the selected interface language.

**AC-THEME-3.** Given a diagram is open, when the user changes the theme, then the modeler is not re-imported, the selection is unchanged, and a validation result that is already shown stays shown. The theme and the interface language are independent: changing one does not change the other.

### UI states

**AC-UI-1.** Given the diagram has not imported yet, when the app renders, then a status says `Opening the invoice diagram…`.

**AC-UI-2.** Given import fails, when the error is caught, then a status says the diagram could not be opened and an alert shows the error message.

### Camunda 8 (Zeebe) integration

**AC-ZEEBE-1.** Given a Service Task is selected, when the properties panel renders, then it displays the `Job Type` field populated with `zeebe:taskDefinition`'s type if present. When the user enters and commits a new job type, then `zeebe:taskDefinition` is updated via moddle properties inside the command stack, allowing undo and redo.

**AC-ZEEBE-2.** Given the diagram is saved or downloaded after configuring a job type on a Service Task, then the resulting XML contains `<bpmn:extensionElements><zeebe:taskDefinition type="..." /></bpmn:extensionElements>` and declares `xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"`.

**AC-ZEEBE-3.** Given a User Task is selected, when the properties panel renders, then it displays the `Form ID` field populated with `zeebe:formDefinition`'s formId if present. When the user enters and commits a new formId, then `zeebe:formDefinition` is updated via moddle properties inside the command stack, allowing undo and redo.

### Interactive simulation, visual export, and canvas navigation

**AC-SIM-1.** Given the modeler is active, when the user toggles the Simulation button, then `bpmn-js-token-simulation` is toggled on the canvas. When active, interactive execution tokens can be stepped through the invoice approval flow. Turning simulation on does not re-import the diagram or change its elements. Given token simulation is on, when Open BPMN, New diagram, Invoice sample, or a prepared prompt successfully imports, then simulation ends and the toolbar shows Simulation. Given token simulation is on, when Open BPMN rejects a file or a prompt is not prepared, then the diagram that was open stays, the shown check result stays, and the toolbar still shows Stop simulation.

**AC-SVG-1.** Given a diagram is loaded on the canvas, when the user triggers SVG export, then the editor extracts the diagram SVG via `saveSVG()` and triggers a file download named `invoice-approval.svg`.

**AC-NAV-1.** Given the diagram canvas, then floating viewport controls support zoom in, zoom out, and fit to viewport, and a minimap provides spatial orientation across the diagram.

### Live diagram linting

**AC-LINT-1.** Given the modeler is started, then `bpmn-js-bpmnlint` is active with a Zeebe Service Task rule. When a Service Task lacks a non-empty `zeebe:taskDefinition` type, then the linter flags the element and displays an overlay on the canvas. When a valid job type is provided, the issue marker on that element disappears.

**AC-ARCH-1.** Given the source tree, when the architecture test reads it, then `src/domain` has no React, bpmn-js, diagram-js, `src/i18n`, or DOM parser usage, `DOMParser` appears only in the XML adapter, and bpmn-js imports appear only in the modeler adapter and `src/main.tsx`.
