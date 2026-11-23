# A prepared prompt stands in for the language model

## Status

Accepted

## Context

This repository has no backend and ships no API key, so a browser call to a live language model has nowhere honest to go. The prompt still has to do something an evaluator can repeat: a legal-document flowchart on a blank process, and a refusal for anything else.

## Decision

This slice does not call a live language model. A prepared prompt for the legal-document workflow returns a fixed BPMN document. Any other prompt leaves the blank process and says this build has no live language model. A session-key field is out of scope. The imported document must contain exactly one process, and every flow node must have a shape. Otherwise the import fails, the blank process stays, and the error is shown. Returning to the invoice sample re-imports the bundled XML the same way Open BPMN does. The prompt is shown exactly when the process is blank, including when undo or delete brings that state back. The prompt may be written in English or Polish. Names in the diagram stay as the XML wrote them.

## Considered Options

- A live language model with a key typed for the session. The key still sits in the browser, and the demo is not repeatable.
- A fixture that answers every sentence with the same flowchart. The box would pretend to understand text it does not read.
- Importing XML that has no shapes, or more than one process, and hoping the canvas is readable.

## Consequences

- Paraphrases of the prepared prompt do not generate a diagram.
- After generation, undo does not restore the blank process. Deleting every node and flow does, and the prompt returns with that blank process.
- Switching the interface language does not translate the generated names and does not import again.
