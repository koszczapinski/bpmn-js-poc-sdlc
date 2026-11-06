# Engineering rules

This repository is a small BPMN.js proof of concept. Keep the change as small as the demo.

- Validation in `src/domain` stays pure. Do not import React, bpmn-js, diagram-js, or the DOM from that folder.
- Parse BPMN XML only in `src/adapters/parseBpmnXml.ts`. Talk to the bpmn-js modeler only in `src/adapters/bpmnEditor.ts`.
- Do not describe the structural check as a BPMN 2.0 schema validator or an execution engine. The subset is specified in `docs/specs/invoice-approval-poc.md`.
- Change behavior by updating that spec first, then a failing test, then the code. Keep the traceability table in `docs/ai-native-workflow.md` accurate.
- A code change is not done until `npm run check` passes: typecheck, lint, format check, and tests.
- Do not add a dependency the demo does not use. Do not add a backend, auth, or a database.
- A human reviews the diff and merges it. Do not merge on your own.
