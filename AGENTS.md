# Engineering rules

This repository is a small BPMN.js proof of concept. Keep the change as small as the demo.

- Validation in `src/domain` stays pure. Do not import React, bpmn-js, diagram-js, or the DOM from that folder.
- The active bpmn-js modeler is the only diagram. React may store UI state only: the current selection snapshot, validation status and findings, an in-progress name draft, and the selected interface language. Do not copy the BPMN model into React state, TanStack Query, or any other store. This demo has no server to synchronize, so those tools are not used.
- Refresh that UI from modeler events after import, edit, and export: `selection.changed`, `element.changed`, and `commandStack.changed`. Read XML through the adapter only when validating or downloading.
- Parse BPMN XML only in `src/adapters/parseBpmnXml.ts`. Talk to the bpmn-js modeler only in `src/adapters/bpmnEditor.ts`.
- Do not describe the structural check as a BPMN 2.0 schema validator or an execution engine. The subset is specified in `docs/specs/invoice-approval-poc.md`.
- Change behavior by updating that spec first, then a failing test, then the code. Keep the traceability table in `docs/ai-native-workflow.md` accurate.
- A code change is not done until `npm run check` passes: typecheck, lint, format check, and tests.
- Do not add a dependency the demo does not use. Do not add a backend, auth, or a database.
- A human reviews the diff and merges it. Do not merge on your own.

## Open Mercato SDLC

Delivery flow, labels, and QA gate: `SDLC.md`. Pipeline config: `.ai/agentic.config.json`. Review rules: `CODE_REVIEW.md`. Protected surfaces: `BACKWARD_COMPATIBILITY.md`.

Installed skills live under `.agents/skills/` (`om-*`). Prefer naming the skill for the next change (for example `om-brainstorm`, `om-spec-writing`, `om-auto-create-pr`, `om-auto-review-pr`) instead of free-form implementation. Behavior of this demo still goes through `docs/specs/invoice-approval-poc.md` and the local `.claude/skills/spec` + `.claude/skills/tdd` loop when those ACs change.
