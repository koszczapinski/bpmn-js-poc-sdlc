# A successful import ends token simulation

## Status

Accepted

## Context

Token simulation plays back the diagram currently on the canvas. Open BPMN, New, a prepared prompt, and the return to the invoice sample all replace that diagram. Leaving simulation on would keep the toolbar on „Stop simulation” over a process the tokens no longer belong to.

## Decision

Every successful import turns token simulation off when it was on. This covers Open BPMN, New, a prepared prompt, and the return to the invoice sample. The toolbar shows Simulation again. A failed import does not change the mode. An unprepared prompt does not change the mode, because the blank process stays.

## Considered Options

- Leave the mode as Open BPMN leaves it today. The control would stay active across a diagram that was just replaced.

## Consequences

- AC-SIM-1 gains a rule: a successful import ends the mode. Turning simulation on still does not change the Model.
