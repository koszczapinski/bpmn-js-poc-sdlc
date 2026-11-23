# A prompt fills only a blank process

## Status

Accepted

## Context

The invoice-approval diagram is the showcase an evaluator sees on open: structural check, Zeebe lint, and token simulation. A second story is that a person can start from nothing and ask a language model for a whole flowchart, for example a legal-document workflow. Generating over the invoice diagram, or opening on a blank canvas, would hide or replace that showcase.

## Decision

The app still opens on the invoice-approval process. New creates a blank process: one process, no flow nodes, no sequence flows, and no lone start event. A prompt is available only on that blank process, before a node is placed or a diagram is loaded. The language model authors one BPMN XML document. The modeler imports it the same way it opens a file: the flowchart replaces the blank process, the viewport is fitted, and undo history starts over. A failed import leaves the blank process and shows the error. Validate does not gate the import. This repository adds no backend, and the client bundle contains no API key.

## Considered Options

- Open on a blank process, with the invoice file available only on request. A bad generation would be the first impression.
- Allow the prompt on the invoice diagram or on any diagram that already has elements.
- Have the language model return semantic operations instead of BPMN XML.
- Add a backend, or ship an API key in the client, so the browser can call a live language model.

## Consequences

- On a blank process the structural check reports a missing start and a missing end. That is the blank state, not a broken import.
- After a successful generation, one undo does not restore the blank process, because the import starts a new history.
- The same structural check runs on the generated flowchart. A pass does not mean the document is valid BPMN or executable.
- A return to the invoice sample exists and does not rely on undo.
