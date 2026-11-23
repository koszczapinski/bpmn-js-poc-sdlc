declare module 'bpmn-js-bpmnlint' {
  import type { ModuleDeclaration } from 'didi'
  const lintModule: ModuleDeclaration
  export default lintModule
}

declare module 'bpmn-js-token-simulation' {
  import type { ModuleDeclaration } from 'didi'
  const tokenSimulationModule: ModuleDeclaration
  export default tokenSimulationModule
}

declare module 'diagram-js-minimap' {
  import type { ModuleDeclaration } from 'didi'
  const minimapModule: ModuleDeclaration
  export default minimapModule
}

declare module 'diagram-js-minimap/dist/index.esm.js' {
  import type { ModuleDeclaration } from 'didi'
  const minimapModule: ModuleDeclaration
  export default minimapModule
}

declare module 'bpmn-moddle' {
  export class BpmnModdle {
    constructor(options?: Record<string, unknown>)
    fromXML(xmlStr: string, options?: Record<string, unknown>): Promise<{ rootElement: unknown }>
    toXML(element: unknown, options?: Record<string, unknown>): Promise<{ xml: string }>
    create(type: string, attrs?: Record<string, unknown>): Record<string, unknown>
  }
}
