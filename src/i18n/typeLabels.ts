import { TYPE_LABELS, isKnownType, localTypeName, type TypeName } from '../domain/typeLabels'
import type { Locale } from './messages'

const TYPE_LABELS_PL: Record<TypeName, string> = {
  startEvent: 'Zdarzenie początkowe',
  endEvent: 'Zdarzenie końcowe',
  intermediateCatchEvent: 'Pośrednie zdarzenie przechwytujące',
  intermediateThrowEvent: 'Pośrednie zdarzenie zgłaszające',
  boundaryEvent: 'Zdarzenie graniczne',
  implicitThrowEvent: 'Niejawne zdarzenie zgłaszające',
  task: 'Zadanie',
  userTask: 'Zadanie użytkownika',
  serviceTask: 'Zadanie usługowe',
  scriptTask: 'Zadanie skryptowe',
  businessRuleTask: 'Zadanie reguły biznesowej',
  manualTask: 'Zadanie ręczne',
  sendTask: 'Zadanie wysyłania',
  receiveTask: 'Zadanie odbierania',
  callActivity: 'Aktywność wywołująca',
  subProcess: 'Podproces',
  transaction: 'Transakcja',
  adHocSubProcess: 'Podproces ad hoc',
  exclusiveGateway: 'Bramka wyłączna',
  parallelGateway: 'Bramka równoległa',
  inclusiveGateway: 'Bramka łączna',
  eventBasedGateway: 'Bramka oparta na zdarzeniach',
  complexGateway: 'Bramka złożona',
  sequenceFlow: 'Przepływ sekwencji',
}

/** Readable name of a BPMN type in the given language; unknown types show their local name. */
export function typeLabel(locale: Locale, type: string): string {
  const local = localTypeName(type)
  if (!isKnownType(local)) return local
  return locale === 'pl' ? TYPE_LABELS_PL[local] : TYPE_LABELS[local]
}
