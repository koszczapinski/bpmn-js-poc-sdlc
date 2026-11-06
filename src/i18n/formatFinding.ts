import type { Finding } from '../domain/types'
import type { Locale } from './messages'
import { translate } from './translate'
import { typeLabel } from './typeLabels'

/**
 * Words a finding in the given language from its code and params.
 * Falls back to the finding's English message when a node finding has no params.
 */
export function formatFinding(locale: Locale, finding: Finding): string {
  const { code, params } = finding
  if (code === 'missing-start' || code === 'missing-end') {
    return translate(locale, `finding.${code}`)
  }
  if (!params) return finding.message

  const type = typeLabel(locale, params.nodeType)
  const subject = params.nodeName
    ? translate(locale, 'finding.subject', { type, name: params.nodeName, id: params.nodeId })
    : translate(locale, 'finding.subjectUnnamed', { type, id: params.nodeId })
  return translate(locale, `finding.${code}`, { subject, count: params.count ?? 0 })
}
