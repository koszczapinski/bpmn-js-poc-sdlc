# Camunda 8 Moddle Extension and Live Linting

## Status

Accepted

## Context

To demonstrate deep competence in the Camunda/bpmn.io ecosystem during technical evaluation, the proof of concept needs to support vendor-specific process properties and live modeling diagnostics without violating core domain separation.

## Decision

We integrate `zeebe-bpmn-moddle` into `bpmn-js` for Camunda 8 extension elements (specifically `zeebe:taskDefinition` on Service Tasks) and embed `bpmn-js-bpmnlint` directly in the adapter layer with a dedicated rule requiring task definitions. We preserve the pure TypeScript domain validator (`src/domain/validateProcess.ts`) strictly for high-level invoice business logic.

## Consequences

- The diagram editor supports editing execution metadata (`zeebe:taskDefinition type`) within the `commandStack` transaction boundary (supporting undo/redo).
- Visual lint warnings appear live on the canvas via official bpmn.io overlays.
- `src/domain/` remains 100% pure and decoupled from bpmn-js, moddle, and the DOM.
