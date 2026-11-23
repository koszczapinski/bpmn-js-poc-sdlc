# New loads a blank process and a prepared prompt fills it

## Status

Accepted

## Context

The prompt on a blank process is a fixture, not a live language model. The evaluator still needs a repeatable legal-document flowchart, a refusal for any other sentence, and a way back to the invoice sample that does not depend on undo.

## Decision

New imports a blank process the same way Open BPMN imports a file. It does not ask for confirmation. Selection and a shown check result clear. Interface language and theme stay. Undo history starts over, so undo does not restore the invoice diagram. The return action re-imports the bundled invoice XML by that same path.

After trimming and ignoring case, the only prepared prompts are „wygeneruj diagram dla obiegu dokumentów prawnych” and „generate a diagram for a legal document workflow”. Any other text, including a paraphrase, leaves the blank process, shows the error in the same alert as a failed open, and does not clear a shown check result.

Both prompts import the same process shape with names in the language of the sentence. The process is not executable. It runs from a start through „Przyjmij dokument” and „Zweryfikuj dokument” to an exclusive gateway „Przyjęty?”. The default branch „Tak” goes through „Złóż do akt” to the end „Złożony”. The other branch „Nie” goes through „Zwróć autorowi” to the end „Zwrócony”. Each user task has a Zeebe form id, and the service task has a Zeebe job type, so the existing lint rules stay quiet and the structural check passes. The English prompt uses the English names of those same nodes. The process name is „Obieg dokumentów prawnych” or „Legal document workflow”. Both files share one set of ids: `Process_LegalDocuments`, `Start_Legal`, `Task_ReceiveDocument`, `Task_ReviewDocument`, `Gateway_Accepted`, `Flow_ToReceive`, `Flow_ToReview`, `Flow_ToGateway`, `Flow_Accepted`, `Flow_Rejected`, `Task_FileDocument`, `Flow_ToFiled`, `End_Filed`, `Task_ReturnToAuthor`, `Flow_ToReturned`, `End_Returned`. `Flow_Accepted` is the default and is named „Tak” or „Yes”. `Flow_Rejected` is named „Nie” or „No”. No sequence flow has a condition. Zeebe form ids are `receive-legal-document`, `review-legal-document`, and `return-legal-document`. The job type is `file-legal-document`. Those identifiers do not change with interface language.

A prompt that trims to nothing does not submit. The button stays disabled, no alert is shown, and the process does not change.

On a blank process the prompt is a text field and a submit button. It does not cover the palette. The first drawn node hides it. Submitting an unprepared sentence does not change the process.

## Considered Options

- Ask for confirmation before New discards edits to the invoice diagram. Open BPMN does not ask, and a second discard rule would be a different product.
- Give the generated service task no job type, so lint lights up immediately. That reads as a broken generation rather than as the Camunda panel the showcase already has.

## Consequences

- Download keeps the name `invoice-approval.bpmn` for whatever the modeler holds, including this flowchart.
