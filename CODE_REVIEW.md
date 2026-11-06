# Code review

Rules for humans and for `om-code-review` / `om-auto-review-pr` in this repository.

## Priorities

1. **Correctness against the invoice-approval subset** — does the change match `docs/specs/invoice-approval-poc.md` and the AC row it claims?
2. **Architecture boundaries** — pure validation stays in `src/domain`; XML parse only in `src/adapters/parseBpmnXml.ts`; modeler only in `src/adapters/bpmnEditor.ts`.
3. **Diagram ownership** — React must not become a second BPMN model. UI state is selection, validation status/findings, and an in-progress name draft only.
4. **Honesty of the structural check** — never imply BPMN 2.0 schema validity or process execution.
5. **Demo size** — no unused dependencies, no backend/auth/database for this POC.

## Repo-specific checks

- Spec first for behavior changes; keep the traceability table in `docs/ai-native-workflow.md` accurate.
- Validation gate before approve: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (same as CI).
- New findings or UI copy that describe the check as a schema validator or engine → blocker.
- Importing React / bpmn-js / diagram-js / DOM into `src/domain` → blocker.
- Copying the BPMN model into React state, TanStack Query, or another store → blocker.
- Prefer small diffs; do not expand scope into a general BPMN platform.

## Severity

| Severity | Use for |
| -------- | ------- |
| Blocker | Boundary violations, false BPMN-compliance claims, broken AC coverage, failing gate |
| Major | Missing tests for a new AC, unclear selection/validation UX regressions |
| Minor | Naming, comment noise, non-blocking style within Prettier/ESLint |

A `risk-high` PR needs the evidence listed in `SDLC.md`. This demo has no auth, money, or multi-tenant surfaces today — treat broad diagram/model architecture changes as higher risk.
