# Backward compatibility

Protected contract surfaces for this BPMN.js invoice-approval POC. There is no published npm package, HTTP API, or database.

## Surfaces

| Surface | Location | Breaking change means | Required path |
| ------- | -------- | --------------------- | ------------- |
| Invoice-approval acceptance criteria | `docs/specs/invoice-approval-poc.md` | Changing expected diagram behavior, validation messages, or UI contracts without updating ACs | Update the spec first, then failing tests, then code; sync `docs/ai-native-workflow.md` |
| Structural validation findings | `src/domain/validateProcess.ts` and AC-VAL-* | Changing finding text or rules that existing tests assert | Spec + tests first; do not silently rewrite messages |
| Bundled sample process | `src/bpmn/invoiceApproval.bpmn` (+ `src/bpmn/sample.ts`) | Changing process id, node ids, or flow that AC-FLOW-1 locks | Spec update and adapter/App tests |
| XML parse errors | `src/adapters/parseBpmnXml.ts` (AC-PARSE-*) | Changing error classes/messages callers and tests rely on | Spec + tests; keep `BpmnParseError` semantics clear |
| Modeler adapter events | `src/adapters/bpmnEditor.ts` | Changing which UI state is refreshed from `selection.changed` / `element.changed` / `commandStack.changed` | Document in spec if behavior changes; keep React free of a second diagram model |
| Download artifact | Download button → `invoice-approval.bpmn` | Renaming the file or changing that contents come from the live modeler | Spec AC-FLOW-4 + App test |
| Validation gate scripts | `package.json` `check` / CI | Removing typecheck, lint, format, or tests from the gate | Update `.ai/agentic.config.json`, `SDLC.md`, and `.github/workflows/ci.yml` together |

## Out of scope (not protected yet)

- Visual CSS chrome (layout/theme) unless an AC names specific copy or roles.
- Full BPMN 2.0 compliance or engine executability — explicitly not a contract of this demo.
