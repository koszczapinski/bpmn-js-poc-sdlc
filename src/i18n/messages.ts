export type Locale = 'en' | 'pl'

export const LOCALES: readonly Locale[] = ['en', 'pl']
export const DEFAULT_LOCALE: Locale = 'en'

/** A plain string, or one string per plural form of the selected language. */
export type Message = string | (Partial<Record<Intl.LDMLPluralRule, string>> & { other: string })

const en = {
  'app.kicker': 'BPMN.js proof of concept',
  'app.title': 'Invoice approval',
  'app.lede':
    'Clerk validation → amount split (auto ≤ 1,000 PLN / manager above) → archive. Invalid invoices loop through clarification.',
  'language.label': 'Language',
  'status.loading': 'Opening the invoice diagram…',
  'status.ready': 'Diagram ready',
  'status.error': 'The diagram could not be opened',
  'toolbar.fit': 'Fit',
  'toolbar.validate': 'Validate',
  'toolbar.checking': 'Checking…',
  'toolbar.download': 'Download BPMN',
  'canvas.label': 'Diagram canvas',
  'canvas.caption': 'Drag to pan · scroll to zoom · click a shape · Delete removes it',
  'notes.summary': 'Import notes ({count})',
  'selection.heading': 'Selection',
  'selection.id': 'Id',
  'selection.type': 'Type',
  'selection.name': 'Name',
  'selection.hint': 'Applied to the BPMN element when you leave the field.',
  'selection.empty': 'Select a shape or flow. This panel shows its id, type, and name.',
  'check.heading': 'Structure check',
  'check.rules':
    'Rules: a start event, an end event, incoming and outgoing sequence flows, and exclusive gateways with at least two outgoing flows. Not a BPMN 2.0 schema check or a process engine.',
  'check.idle': 'Not checked yet.',
  'check.running': 'Checking structure…',
  'check.ok': 'No structural issues in this subset.',
  'check.count': { one: '{count} structural issue.', other: '{count} structural issues.' },
  'focus.notOnDiagram': '"{id}" is not on the current diagram.',
  'error.modelerNotReady': 'The modeler is not ready.',
  'error.openFailed': 'The diagram could not be opened.',
  'error.checkFailed': 'The diagram could not be checked.',
  'error.downloadFailed': 'The diagram could not be downloaded.',
  'finding.subject': '{type} "{name}" ({id})',
  'finding.subjectUnnamed': '{type} {id}',
  'finding.missing-start': 'The process has no start event.',
  'finding.missing-end': 'The process has no end event.',
  'finding.missing-incoming': '{subject} has no incoming sequence flow.',
  'finding.missing-outgoing': '{subject} has no outgoing sequence flow.',
  'finding.exclusive-gateway-outgoing': {
    one: '{subject} has {count} outgoing sequence flow; at least 2 are required.',
    other: '{subject} has {count} outgoing sequence flows; at least 2 are required.',
  },
} as const satisfies Record<string, Message>

export type MessageKey = keyof typeof en

const pl: Record<MessageKey, Message> = {
  'app.kicker': 'Prototyp BPMN.js',
  'app.title': 'Zatwierdzanie faktury',
  'app.lede':
    'Walidacja przez referenta → podział wg kwoty (automat ≤ 1000 PLN / powyżej kierownik) → archiwizacja. Błędne faktury wracają do wyjaśnienia.',
  'language.label': 'Język',
  'status.loading': 'Otwieranie diagramu faktury…',
  'status.ready': 'Diagram gotowy',
  'status.error': 'Nie udało się otworzyć diagramu',
  'toolbar.fit': 'Dopasuj',
  'toolbar.validate': 'Sprawdź',
  'toolbar.checking': 'Sprawdzanie…',
  'toolbar.download': 'Pobierz BPMN',
  'canvas.label': 'Płótno diagramu',
  'canvas.caption':
    'Przeciągnij, aby przesunąć · przewiń, aby powiększyć · kliknij kształt · Delete usuwa',
  'notes.summary': 'Uwagi z importu ({count})',
  'selection.heading': 'Zaznaczenie',
  'selection.id': 'Id',
  'selection.type': 'Typ',
  'selection.name': 'Nazwa',
  'selection.hint': 'Zapisywana w elemencie BPMN po opuszczeniu pola.',
  'selection.empty': 'Zaznacz kształt lub przepływ. Ten panel pokaże jego id, typ i nazwę.',
  'check.heading': 'Kontrola struktury',
  'check.rules':
    'Reguły: zdarzenie początkowe, zdarzenie końcowe, przychodzące i wychodzące przepływy sekwencji oraz bramki wyłączne z co najmniej dwoma wyjściami. To nie jest walidacja schematu BPMN 2.0 ani silnik procesów.',
  'check.idle': 'Jeszcze nie sprawdzono.',
  'check.running': 'Sprawdzanie struktury…',
  'check.ok': 'Brak problemów strukturalnych w tym podzbiorze.',
  'check.count': {
    one: '{count} problem strukturalny.',
    few: '{count} problemy strukturalne.',
    many: '{count} problemów strukturalnych.',
    other: '{count} problemu strukturalnego.',
  },
  'focus.notOnDiagram': '„{id}” nie znajduje się na bieżącym diagramie.',
  'error.modelerNotReady': 'Edytor nie jest gotowy.',
  'error.openFailed': 'Nie udało się otworzyć diagramu.',
  'error.checkFailed': 'Nie udało się sprawdzić diagramu.',
  'error.downloadFailed': 'Nie udało się pobrać diagramu.',
  'finding.subject': '{type} "{name}" ({id})',
  'finding.subjectUnnamed': '{type} {id}',
  'finding.missing-start': 'Proces nie ma zdarzenia początkowego.',
  'finding.missing-end': 'Proces nie ma zdarzenia końcowego.',
  'finding.missing-incoming': '{subject} nie ma przychodzącego przepływu sekwencji.',
  'finding.missing-outgoing': '{subject} nie ma wychodzącego przepływu sekwencji.',
  'finding.exclusive-gateway-outgoing': {
    one: '{subject} ma {count} wychodzący przepływ sekwencji; wymagane są co najmniej 2.',
    few: '{subject} ma {count} wychodzące przepływy sekwencji; wymagane są co najmniej 2.',
    many: '{subject} ma {count} wychodzących przepływów sekwencji; wymagane są co najmniej 2.',
    other: '{subject} ma {count} wychodzącego przepływu sekwencji; wymagane są co najmniej 2.',
  },
}

export const messages: Record<Locale, Record<MessageKey, Message>> = { en, pl }
