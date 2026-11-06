# AI-native workflow

The intended loop for a behavior change is:

1. **Spec first.** Update `docs/specs/invoice-approval-poc.md` when the expected behavior changes.
2. **Small tests.** Add or adjust the test named for that criterion so it fails for the right reason.
3. **Implementation.** Keep validation in `src/domain` and XML parsing in `src/adapters/parseBpmnXml.ts`.
4. **CI quality gate.** `npm run check` locally. GitHub Actions runs the same commands on pull requests and on pushes to `main`.
5. **Human merge.** A person reviews the diff and merges. Agents do not merge.

`AGENTS.md` is the short rule list. `.claude/skills/spec` and `.claude/skills/tdd` point here instead of copying it.

## What is actually enforced

| Check                  | Where it runs                 | What it does                                   |
| ---------------------- | ----------------------------- | ---------------------------------------------- |
| `npm run typecheck`    | local `npm run check`, and CI | `tsc -b`                                       |
| `npm run lint`         | local `npm run check`, and CI | ESLint                                         |
| `npm run format:check` | local `npm run check`, and CI | Prettier                                       |
| `npm test`             | local `npm run check`, and CI | Vitest, including the criteria below           |
| CI install             | `.github/workflows/ci.yml`    | `npm ci` on Node 22, using `package-lock.json` |

CI does not deploy and does not start a database or browser service.

## What is policy or guidance, not a gate

| Item                                  | Status                                                                                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update the spec before the code       | Team rule in `AGENTS.md`. Git does not block a commit that skips it.                                                                                                                                                          |
| A human reviews and merges            | Team rule. This repository does not enable branch protection from these files.                                                                                                                                                |
| Claude Code `SessionStart` hook       | Optional. `.claude/settings.json` runs `node scripts/claude-session-context.mjs`, which prints guidance and exits 0. It does not run tests, does not block the session, and CI does not execute it. The app does not read it. |
| Full BPMN 2.0 compliance or execution | Out of scope. Not planned inside this demo. A passing AC-VAL-6 result is not that claim.                                                                                                                                      |

## Traceability

| Criterion  | Test                                                          |
| ---------- | ------------------------------------------------------------- |
| AC-FLOW-1  | `src/adapters/invoiceApprovalXml.test.ts`                     |
| AC-FLOW-2  | `src/App.test.tsx`                                            |
| AC-FLOW-3  | `src/App.test.tsx`                                            |
| AC-FLOW-4  | `src/App.test.tsx`                                            |
| AC-FLOW-5  | `src/App.test.tsx`                                            |
| AC-FLOW-6  | `src/App.test.tsx`                                            |
| AC-FLOW-7  | `src/App.test.tsx`                                            |
| AC-STATE-1 | `src/App.test.tsx`                                            |
| AC-VAL-1   | `src/domain/validateProcess.test.ts`                          |
| AC-VAL-2   | `src/domain/validateProcess.test.ts`                          |
| AC-VAL-3   | `src/domain/validateProcess.test.ts`                          |
| AC-VAL-4   | `src/domain/validateProcess.test.ts`                          |
| AC-VAL-5   | `src/domain/validateProcess.test.ts`                          |
| AC-VAL-6   | `src/adapters/invoiceApprovalXml.test.ts`, `src/App.test.tsx` |
| AC-VAL-7   | `src/App.test.tsx`                                            |
| AC-VAL-8   | `src/App.test.tsx`                                            |
| AC-PARSE-1 | `src/adapters/parseBpmnXml.test.ts`                           |
| AC-PARSE-2 | `src/adapters/parseBpmnXml.test.ts`                           |
| AC-PARSE-3 | `src/adapters/parseBpmnXml.test.ts`                           |
| AC-PARSE-4 | `src/adapters/parseBpmnXml.test.ts`                           |
| AC-PARSE-5 | `src/adapters/parseBpmnXml.test.ts`                           |
| AC-PARSE-6 | `src/App.test.tsx`                                            |
| AC-UI-1    | `src/App.test.tsx`                                            |
| AC-UI-2    | `src/App.test.tsx`                                            |
| AC-I18N-1  | `src/App.test.tsx`                                            |
| AC-I18N-2  | `src/App.test.tsx`                                            |
| AC-I18N-3  | `src/App.test.tsx`                                            |
| AC-I18N-4  | `src/i18n/messages.test.ts`, `src/i18n/formatFinding.test.ts` |
| AC-I18N-5  | `src/domain/validateProcess.test.ts`                          |
| AC-ARCH-1  | `src/domain/architecture.test.ts`                             |

Every row above is an automated test. None of them are marked planned.
