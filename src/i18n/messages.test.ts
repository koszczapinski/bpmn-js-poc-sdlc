import { describe, expect, it } from 'vitest'
import { TYPE_LABELS } from '../domain/typeLabels'
import { LOCALES, messages, type Message } from './messages'
import { translate } from './translate'
import { typeLabel } from './typeLabels'

function variants(message: Message): string[] {
  return typeof message === 'string' ? [message] : Object.values(message)
}

function placeholders(message: Message): string[] {
  const names = new Set<string>()
  for (const text of variants(message)) {
    for (const match of text.matchAll(/\{(\w+)\}/g)) names.add(match[1] ?? '')
  }
  return [...names].sort()
}

describe('dictionaries', () => {
  it('AC-I18N-4: English and Polish define the same keys with the same placeholders', () => {
    expect(LOCALES).toEqual(['en', 'pl'])
    const keys = Object.keys(messages.en).sort()
    expect(Object.keys(messages.pl).sort()).toEqual(keys)

    for (const key of keys) {
      const en = messages.en[key as keyof typeof messages.en]
      const pl = messages.pl[key as keyof typeof messages.pl]
      expect(placeholders(pl), key).toEqual(placeholders(en))
      for (const text of [...variants(en), ...variants(pl)]) expect(text.trim(), key).not.toBe('')
    }
  })

  it('AC-I18N-4: Polish plural entries define every Polish plural form', () => {
    for (const [key, message] of Object.entries(messages.pl)) {
      if (typeof message === 'string') continue
      expect(Object.keys(message).sort(), key).toEqual(['few', 'many', 'one', 'other'])
    }
  })

  it('AC-I18N-4: every English element type label is also translated into Polish', () => {
    for (const type of Object.keys(TYPE_LABELS)) {
      expect(typeLabel('en', `bpmn:${type}`)).toBe(TYPE_LABELS[type as keyof typeof TYPE_LABELS])
      expect(typeLabel('pl', type).length).toBeGreaterThan(0)
    }
    expect(typeLabel('pl', 'bpmn:UserTask')).toBe('Zadanie użytkownika')
    expect(typeLabel('en', 'bpmn:SomethingNew')).toBe('somethingNew')
    expect(typeLabel('pl', 'bpmn:SomethingNew')).toBe('somethingNew')
  })
})

describe('translate', () => {
  it('fills {placeholders} and leaves unknown ones visible', () => {
    expect(translate('en', 'focus.notOnDiagram', { id: 'Task_1' })).toBe(
      '"Task_1" is not on the current diagram.',
    )
    expect(translate('pl', 'focus.notOnDiagram', { id: 'Task_1' })).toBe(
      '„Task_1” nie znajduje się na bieżącym diagramie.',
    )
    expect(translate('en', 'focus.notOnDiagram')).toBe('"{id}" is not on the current diagram.')
  })

  it('AC-I18N-4: picks English plural forms', () => {
    expect(translate('en', 'check.count', { count: 1 })).toBe('1 structural issue.')
    expect(translate('en', 'check.count', { count: 3 })).toBe('3 structural issues.')
  })

  it('AC-I18N-4: picks Polish plural forms (one, few, many)', () => {
    expect(translate('pl', 'check.count', { count: 1 })).toBe('1 problem strukturalny.')
    expect(translate('pl', 'check.count', { count: 2 })).toBe('2 problemy strukturalne.')
    expect(translate('pl', 'check.count', { count: 5 })).toBe('5 problemów strukturalnych.')
    expect(translate('pl', 'check.count', { count: 22 })).toBe('22 problemy strukturalne.')
    expect(translate('pl', 'check.count', { count: 0 })).toBe('0 problemów strukturalnych.')
  })
})
