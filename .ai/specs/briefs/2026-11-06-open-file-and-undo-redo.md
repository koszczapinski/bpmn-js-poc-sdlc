# Add open-local-BPMN-file (replaces diagram) and undo/redo buttons

- Date: 2026-11-06
- Category: feature
- Priority signal: high — needed for a phase-2 tech interview; under one day of time
- Risk signal: low — small UI additions; the main risk is changing AC-FLOW-2 and AC-STATE-1 behavior
- Routing: Next: om-auto-create-pr "Add open-local-BPMN-file (replaces diagram) and undo/redo buttons — brief: .ai/specs/briefs/2026-11-06-open-file-and-undo-redo.md"

## Problem

The demo can only show the bundled invoice diagram and download its XML. For an interview, the product story should include loading a user's own process, validating it, and editing with visible undo/redo. Nothing is tracked or in flight for this (no issues; merged PRs #1-#3 are pipeline setup and EN/PL i18n).

## Agreed direction

Two features:

- **A. Open a local .bpmn file.** A successful import replaces the current diagram. It is not opened beside the bundled sample.
- **B. Undo/redo toolbar buttons.** Their enabled state follows `commandStack.changed`.

Rejected:

- Export SVG: lower value than A and B.
- Live validation on edit: it reverses AC-STATE-1 and is too risky for a day.
- Build nothing: it is a fallback only if A slips.

Follow the AGENTS.md order: update `docs/specs/invoice-approval-poc.md`, write a failing test, then the code. Keep the `docs/ai-native-workflow.md` traceability table accurate, and make `npm run check` pass.

## Resolved unknowns

| Question                 | Answer (from the conversation)                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interview goal           | Product features                                                                                                                                            |
| Time available           | A day or less                                                                                                                                               |
| Which features           | A (open file) and B (undo/redo)                                                                                                                             |
| Import semantics         | Replace the current diagram                                                                                                                                 |
| Spec impact              | AC-FLOW-2 currently says the sample is the only import, so it needs a new AC for successful import. Add an AC for failed import too. Add ACs for undo/redo. |
| Failed import            | Leave the current diagram untouched and show an error, in the spirit of AC-UI-2.                                                                            |
| Stale state after import | Clear validation findings (AC-STATE-1 behavior) and the selection.                                                                                          |
| Layering                 | File reading and `importXML` go through `src/adapters/bpmnEditor.ts`. Parsing stays in `parseBpmnXml.ts`. No bpmn-js imports in components.                 |
| Undo/redo state          | Enabled state comes from `commandStack.changed`, not a copy of the model.                                                                                   |
| i18n                     | New strings need both EN and PL (see merged PR #3).                                                                                                         |
| Download filename        | Stays `invoice-approval.bpmn` (AC-FLOW-4).                                                                                                                  |

## Non-goals

- No "reset to sample" button, unless requested later.
- No export SVG/PNG.
- No live validation on edit.
- No backend, auth, or database, and no new dependency.
- No claim that the structural check is a BPMN 2.0 schema validator.

## Affected areas (if known)

- `docs/specs/invoice-approval-poc.md`, `docs/ai-native-workflow.md`
- `src/adapters/bpmnEditor.ts`, `src/hooks/useInvoiceDiagram.ts`, `src/App.tsx`, and the UI components
- The EN/PL translation files and `src/domain/architecture.test.ts` (must still pass)
