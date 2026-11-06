# Invoice approval BPMN demo

A desktop-first proof of concept for a short technical demo. It opens a real BPMN 2.0 invoice-approval diagram in [bpmn-js](https://github.com/bpmn-io/bpmn-js), lets you select and rename elements, undo and redo edits, open your own `.bpmn` file in place of the sample, runs a small structural check, and downloads the current diagram as BPMN XML.

The check is not a BPMN 2.0 schema validator and this app does not execute processes. A diagram can pass and still be invalid BPMN, or be valid BPMN and still fail these rules. The rules are listed in [the spec](docs/specs/invoice-approval-poc.md).

## 3-minute demo

1. **0:00 — Walk the path.** The diagram is already loaded. A clerk validates the invoice (`Clerk validation`). `Valid?` either loops through `Request clarification` or continues. `Amount > 1000 PLN?` sends amounts up to 1,000 PLN to automatic approval and larger amounts to a manager. Both paths archive the invoice and end. Automatic approval and archive are service tasks; the human steps are user tasks. The process is marked `isExecutable="false"` because nothing here runs it.
2. **1:00 — Select and rename.** Click `Manager approval`. The side panel shows the element id, type, and name. Change the name and leave the field. The label on the shape updates because the edit is written into the BPMN model.
3. **1:40 — Validate the happy path.** Click **Validate**. The sample has a start, an end, connected flow nodes, and two outgoing flows on each exclusive gateway, so the subset reports no issues. Say explicitly that this is not schema validation or a token simulation.
4. **2:10 — Show a finding.** Click the end event and press Delete (or use the trash control on the context pad). Click **Validate** again. Choose a finding in the list. The modeler selects that element and scrolls it into view.
5. **2:40 — Download.** Click **Download BPMN**. The file is the modeler's current XML, including the edit, not a picture of the canvas.

## Architecture

```text
React UI
  -> bpmn-js adapter (import, save, selection, focus)
  -> XML adapter (DOMParser -> process model)
  -> pure validation (process model -> findings)
```

- `src/domain` validates a plain process model. It does not import React, bpmn-js, or the DOM.
- `src/adapters/parseBpmnXml.ts` is the only XML parser. It reads the first process and its direct children. Sequence flows define the graph via `sourceRef` and `targetRef`.
- `src/adapters/bpmnEditor.ts` is the only module that constructs the bpmn-js modeler. The UI never calls bpmn-js itself. Styles load from the official bpmn-js CSS in `src/main.tsx`.
- `src/i18n` holds the EN and PL dictionaries and turns findings and messages into text. `src/domain` never imports it.
- `src/bpmn/invoiceApproval.bpmn` is the initial import only. After that, the modeler is the diagram.

React keeps the selection snapshot, the validation result, and the name field while it is being typed. It does not keep a second copy of the process. Import, element edits, and export refresh the panel from `selection.changed`, `element.changed`, and `commandStack.changed`. Validate and download read XML from the modeler at that moment, then the pure checker runs on the parsed model. TanStack Query and a global store are not used: nothing here is fetched from a server or shared across pages.

The modeler provides pan, zoom, selection, label editing, and delete. **Fit** calls `canvas.zoom('fit-viewport')`.

## Language

The interface opens in English. The **EN | PL** switch in the header changes the interface to Polish and back. It does not touch the diagram: the bundled diagram is English, element names are model data, and switching language neither re-imports the XML nor clears a validation result. bpmn-js canvas and context-pad labels, import notes, and XML parser messages stay in English. Texts live in typed dictionaries in `src/i18n`; no i18n library is used. The language is not stored, so a reload returns to English.

## Rules that are actually checked

- The process has at least one start event and one end event.
- Every flow node except a start event has an incoming sequence flow.
- Every flow node except an end event has an outgoing sequence flow.
- Every exclusive gateway has at least two outgoing sequence flows.

Not checked: BPMN schema, event definitions, conditions, default-flow consistency, message flows, data objects, lanes, nested sub-process contents, or token execution. A joining exclusive gateway with a single outgoing flow is reported even though that shape is normal BPMN. Boundary events are treated like other flow nodes. See the spec for the full list.

## Requirements

- Node.js 22 or newer
- npm

TypeScript is pinned to 5.9 because `typescript-eslint` does not yet accept TypeScript 6 or 7. Runtime dependencies are React and bpmn-js.

## Commands

```bash
npm ci
npm run dev          # http://127.0.0.1:43123
npm run typecheck
npm run lint
npm run format:check
npm test
npm run check        # typecheck, lint, format check, and tests
npm run build
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` on pull requests and on pushes to `main`. There is no deploy step.

## Agent notes

Engineering rules live in `AGENTS.md`. The acceptance criteria and the traceability table live in `docs/specs/invoice-approval-poc.md` and `docs/ai-native-workflow.md`. Those docs say which checks run in CI and which are only team policy.

`.claude/settings.json` registers an optional Claude Code `SessionStart` hook. It prints guidance. It does not run the app, does not run tests, and does not block a session. The app does not read it.
