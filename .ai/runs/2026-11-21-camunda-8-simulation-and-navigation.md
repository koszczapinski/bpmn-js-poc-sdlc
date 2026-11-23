# Execution plan: Camunda 8 Moddle, Live Linting, Token Simulation, and Canvas Navigation

Source brief: "przeanalzuj co zostalo dowiezione i ocen", followed by grilling rounds confirming:

- Commits split: engineering skills suite chore committed separately (`e90f7a2`).
- Presentation boundary: Lint Findings remain canvas overlays, Structural Findings in ValidationPanel.
- Expansion for "WoW" effect: Token Simulation, Zeebe Form Definition for User Tasks, SVG Export, and floating Canvas Navigation / minimap.

## Goal

Provide a modern, high-impact Camunda 8 / bpmn.io proof-of-concept demonstration that:

1. Supports Camunda 8 (Zeebe) metadata editing:
   - `zeebe:taskDefinition` (Job Type) for Service Tasks.
   - `zeebe:formDefinition` (Form ID) for User Tasks.
2. Runs live visual canvas linting with `bpmn-js-bpmnlint` enforcing Zeebe task definitions.
3. Provides interactive step-by-step token simulation via `bpmn-js-token-simulation` toggled from the toolbar.
4. Allows one-click SVG diagram export (`invoice-approval.svg`) alongside BPMN XML download.
5. Equips the canvas with floating zoom controls (Zoom In, Zoom Out, Fit Viewport) and a minimap (`diagram-js-minimap`).
6. Preserves strict domain isolation (pure domain rules in `src/domain`, modeler as single source of truth, transactional edits in `commandStack`).

## Scope

- Spec: `AC-ZEEBE-1`, `AC-ZEEBE-2`, `AC-ZEEBE-3`, `AC-SIM-1`, `AC-SVG-1`, `AC-NAV-1`, `AC-LINT-1`, `AC-ARCH-1` in `docs/specs/invoice-approval-poc.md`.
- ADRs: `docs/adr/0001-camunda-8-linting-and-moddle.md` and `docs/adr/0002-token-simulation-and-canvas-navigation.md`.
- Glossary: `GLOSSARY.md` updated with _Extension Element_, _Zeebe Task Definition_, _Zeebe Form Definition_, _Token Simulation_, _Lint Finding_, _Structural Finding_.
- Traceability: `docs/ai-native-workflow.md` updated with all criteria mapped to automated tests.
- Packages: `bpmn-js-token-simulation`, `diagram-js-minimap`, `zeebe-bpmn-moddle`, `bpmn-js-bpmnlint`.
- Adapter: `src/adapters/bpmnEditor.ts` updated with token simulation, minimap, moddle updates, SVG save, and zoom helpers.
- UI:
  - `src/components/PropertiesPanel.tsx`: Job Type for ServiceTask, Form ID for UserTask.
  - `src/App.tsx`: Toolbar simulation toggle, SVG export, floating zoom controls.
  - `src/i18n/messages.ts`: English and Polish localization keys.
- Verification: 62 automated tests in `vitest`, full `npm run check` pipeline passing.

## Verification

- `npm run typecheck`: clean
- `npm run lint`: clean
- `npm run format:check`: clean
- `npm test`: 62 tests passing
