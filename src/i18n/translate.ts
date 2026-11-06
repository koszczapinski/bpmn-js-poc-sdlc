import { messages, type Locale, type MessageKey } from './messages'

export type MessageParams = Record<string, string | number>

/** Text for the UI: a dictionary key (translated when shown) or text that is shown as it is. */
export type UiText = { key: MessageKey; params?: MessageParams } | { text: string }

const pluralRules = new Map<Locale, Intl.PluralRules>()

function pluralFormFor(locale: Locale, count: unknown): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules.select(Number(count))
}

export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
  const entry = messages[locale][key]
  const template =
    typeof entry === 'string' ? entry : (entry[pluralFormFor(locale, params.count)] ?? entry.other)
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  )
}

export function resolveText(locale: Locale, text: UiText): string {
  return 'key' in text ? translate(locale, text.key, text.params) : text.text
}
