import blankProcessXml from './blankProcess.bpmn?raw'
import legalDocumentEnXml from './legalDocument.en.bpmn?raw'
import legalDocumentPlXml from './legalDocument.pl.bpmn?raw'
import invoiceApprovalXml from './invoiceApproval.bpmn?raw'

export const BLANK_PROCESS_XML = blankProcessXml
export const INVOICE_APPROVAL_XML = invoiceApprovalXml
export const INVOICE_DOWNLOAD_NAME = 'invoice-approval.bpmn'

const PREPARED_PROMPTS: Readonly<Record<string, string>> = {
  'wygeneruj diagram dla obiegu dokumentów prawnych': legalDocumentPlXml,
  'generate a diagram for a legal document workflow': legalDocumentEnXml,
}

/** The two prepared prompts, after trimming the ends and ignoring case. */
export function xmlForPreparedPrompt(prompt: string): string | null {
  return PREPARED_PROMPTS[prompt.trim().toLowerCase()] ?? null
}
