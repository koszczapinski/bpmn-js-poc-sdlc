import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) return []
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) return [path]
    return []
  })
}

function specifiers(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? match[2] ?? '',
  )
}

describe('architecture boundaries', () => {
  it('AC-ARCH-1: domain code does not import React, bpmn-js, or the DOM', () => {
    const files = sourceFiles(join(process.cwd(), 'src/domain'))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(specifiers(source), file).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/react|bpmn-js|diagram-js|adapters|i18n/)]),
      )
      expect(source, file).not.toMatch(/DOMParser|\bdocument\b|\bwindow\b/)
    }
  })

  it('keeps bpmn-js and DOMParser behind their adapters', () => {
    const files = sourceFiles(join(process.cwd(), 'src'))
    const bpmnImporters: string[] = []
    const parserImporters: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const relative = file.slice(process.cwd().length + 1)
      if (
        specifiers(source).some(
          (specifier) => specifier.includes('bpmn-js') || specifier.includes('diagram-js'),
        )
      ) {
        bpmnImporters.push(relative)
      }
      if (source.includes('DOMParser')) parserImporters.push(relative)
    }

    expect(bpmnImporters.sort()).toEqual(['src/adapters/bpmnEditor.ts', 'src/main.tsx'])
    expect(parserImporters).toEqual(['src/adapters/parseBpmnXml.ts'])
  })
})
