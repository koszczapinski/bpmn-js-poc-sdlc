# Invoice Approval PoC

A lightweight browser-based BPMN 2.0 modeler showcasing architectural discipline, pure domain validation, and Camunda/bpmn.io extension points.

## Language

**Diagram**:
The graphical representation and layout of BPMN elements displayed and manipulated on the canvas.
_Avoid_: Schema, process definition

**Model**:
The in-memory semantic BPMN 2.0 object graph representing the business process.
_Avoid_: State, diagram

**Structural Finding**:
A deterministic problem reported by the domain validator indicating an unmet invoice-approval rule.
_Avoid_: Schema error, execution exception, runtime bug

**Lint Finding**:
A rule violation reported by the `bpmnlint` engine evaluating element configuration.
_Avoid_: Compiler warning, validation error

**Extension Element**:
A vendor-specific metadata object (such as Camunda or Zeebe properties) attached to a BPMN flow node via `bpmn-moddle`.
_Avoid_: Custom attribute, tag, annotation

**Zeebe Task Definition**:
A Camunda 8 extension element defining the job worker type responsible for executing a Service Task.
_Avoid_: Topic, worker name, delegate

**Zeebe Form Definition**:
A Camunda 8 extension element linking a User Task to a specific form identifier (`formId`).
_Avoid_: Screen, template, UI component

**Token Simulation**:
An interactive runtime playback mode allowing step-by-step token propagation and branching across the diagram flow nodes directly on the browser canvas.
_Avoid_: Execution engine, workflow backend, process execution
