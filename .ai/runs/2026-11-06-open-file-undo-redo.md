# Execution plan: open a local BPMN file and undo/redo buttons

Source brief: `.ai/specs/briefs/2026-11-06-open-file-and-undo-redo.md` (from `om-brainstorm`).
Source doc: `docs/specs/invoice-approval-poc.md`

## Goal

A user can open a local `.bpmn` file that replaces the diagram in the modeler, and can undo and redo edits with toolbar buttons.

## Scope

- Spec first: new AC-FLOW-5 (open a file), AC-FLOW-6 (a rejected file leaves the diagram as it was), AC-FLOW-7 (undo/redo). Extend AC-STATE-1 and AC-FLOW-2 so an import also clears the check result. Update the traceability table.
- `src/adapters/bpmnEditor.ts`: `replaceXml(xml)`, `undo()`, `redo()`, and a history snapshot (`canUndo`, `canRedo`). This is the only place that talks to the modeler.
- `src/hooks/useInvoiceDiagram.ts`: `openFile(file)`, `undo`, `redo`, and a small `history` UI flag pair that is refreshed from `commandStack.changed` and after an import. It is not a copy of the model.
- UI: an "Open BPMN" button with a hidden file input, "Undo" and "Redo" buttons, EN and PL strings.

## Decisions carried over from the brief (resolved, not asked)

- Opening a file **replaces** the current diagram. There is no side-by-side sample.
- A rejected file leaves the current diagram content unchanged and shows an alert.
- A successful open clears the selection and the validation result.
- Download keeps the name `invoice-approval.bpmn` (AC-FLOW-4).

## Non-goals

- No "reset to sample" button, no SVG/PNG export, no live validation on edit.
- No new dependency, backend, auth, or database.
- No claim that the structural check is a BPMN 2.0 schema validator.

## Risks

- bpmn-js clears the canvas before it renders, so a render-time failure can leave an empty canvas. `replaceXml` takes the current XML first and re-imports it if the new import fails. That can reset the undo history after a failed open; this is accepted and stated in AC-FLOW-6.
- The tests use a mocked `bpmn-js/lib/Modeler`; real bpmn-js behavior is checked by hand in the browser at the end.

## Implementation Plan

### Phase 1: Spec first

1. Add AC-FLOW-5, AC-FLOW-6, AC-FLOW-7 and extend AC-FLOW-2 and AC-STATE-1 in `docs/specs/invoice-approval-poc.md`.
2. Add the new criteria to the traceability table in `docs/ai-native-workflow.md`.

### Phase 2: Undo and redo

1. Failing tests in `src/App.test.tsx` for AC-FLOW-7, with a command-stack mock.
2. Adapter and hook support, then the toolbar buttons with EN and PL strings.

### Phase 3: Open a local file

1. Failing tests for AC-FLOW-5, AC-FLOW-6 and the extended AC-STATE-1.
2. `replaceXml` in the adapter, `openFile` in the hook, the Open button and file input with EN and PL strings.

### Phase 4: Gate and browser check

1. Run `npm run check` and fix failures.
2. Open the app in a browser and exercise open, a bad file, undo and redo by hand.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Spec first

- [ ] 1.1 Update the spec with the new and changed acceptance criteria
- [ ] 1.2 Update the traceability table

### Phase 2: Undo and redo

- [ ] 2.1 Add failing tests for undo and redo
- [ ] 2.2 Implement undo and redo in the adapter, hook, and toolbar

### Phase 3: Open a local file

- [ ] 3.1 Add failing tests for opening a file
- [ ] 3.2 Implement opening a file in the adapter, hook, and toolbar

### Phase 4: Gate and browser check

- [ ] 4.1 Run the full check
- [ ] 4.2 Check the app by hand in a browser
