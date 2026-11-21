# Token Simulation and Canvas Navigation

## Status

Accepted

## Context

To provide a memorable, interactive ("WoW") proof of concept that demonstrates the strengths of client-side BPMN modeling without backend runtime execution overhead, evaluators need intuitive visual simulation and navigation controls.

## Decision

We embed `bpmn-js-token-simulation` and `diagram-js-minimap` directly into the modeler adapter. In addition:

- We add a simulation toggle to the main toolbar for step-by-step token execution.
- We add floating viewport controls (Zoom In, Zoom Out, Fit to Viewport) for spatial navigation.
- We add an "Export SVG" action using `modeler.saveSVG()` alongside XML export.
- We extend `zeebe-bpmn-moddle` support to `zeebe:formDefinition` on User Tasks (`bpmn:UserTask`).

## Consequences

- Evaluators can simulate invoice approval execution directly in the browser canvas.
- The diagram can be exported as an image (SVG) with a single click.
- Modeler architecture remains 100% compliant with project rules: domain stays purely decoupled in `src/domain`, and all diagram mutations happen within bpmn-js `commandStack`.
