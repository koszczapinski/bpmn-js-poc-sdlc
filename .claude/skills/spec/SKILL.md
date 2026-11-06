---
name: spec
description: Use before changing invoice-approval behavior, the bundled BPMN diagram, validation rules, or acceptance criteria.
---

# Spec first

1. Read `docs/specs/invoice-approval-poc.md` and `AGENTS.md`.
2. If the requested behavior is missing or contradicts a criterion, edit the spec and the traceability table in `docs/ai-native-workflow.md` before editing code.
3. Leave the non-goal in place: a passing check is not full BPMN 2.0 compliance, and this app does not execute processes.
4. Use the `tdd` skill for the code change. Commands and the enforced-versus-policy list stay in `docs/ai-native-workflow.md`.
