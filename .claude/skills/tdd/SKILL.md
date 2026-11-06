---
name: tdd
description: Use when implementing a change already described by docs/specs/invoice-approval-poc.md. Write the failing test before production code.
---

# Test first

1. Pick the acceptance criterion you are changing. The spec names the behavior; `docs/ai-native-workflow.md` names the test file.
2. Add or adjust that test so it fails because the behavior is missing, not because the test is broken.
3. Run that file, for example `npx vitest run src/domain/validateProcess.test.ts`. Confirm the failure matches the criterion.
4. Change the smallest amount of production code.
   - Validation stays in `src/domain`.
   - XML parsing stays in `src/adapters/parseBpmnXml.ts`.
   - bpmn-js stays in `src/adapters/bpmnEditor.ts`.
5. Re-run the test file, then `npm run check`.

Do not copy the command list or the merge policy into this skill. They live in `docs/ai-native-workflow.md` and `AGENTS.md`.
