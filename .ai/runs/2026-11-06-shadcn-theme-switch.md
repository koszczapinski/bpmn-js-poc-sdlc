# Execution plan: shadcn/ui and a light/dark theme switch

Source brief: "Add shadcn to the project and change the components to use it, we want a default theme: light + switcher sol / moon icons".
Source doc: `docs/specs/invoice-approval-poc.md`

## Goal

The interface is built on shadcn/ui components (Tailwind CSS), opens in the light theme, and a header switch with sun and moon icons toggles between light and dark.

## Interpretation and assumptions (recorded, not asked)

- "sol" is read as the **sun** icon (Spanish/Portuguese "sol"). The switch shows a sun option and a moon option, like the EN | PL language switch; the selected one is pressed.
- "Default theme: light" means the app always opens light. The selected theme is UI state held by React for the current page only. It is **not persisted** and the browser's `prefers-color-scheme` is **not** consulted, the same rule the language switch follows (AC-I18N-1). A reload returns to light.
- "Change the components to use it" means the app's own controls (buttons, inputs, panels, banners, switches) are replaced by shadcn components. The bpmn-js canvas, palette and context pad are library UI and keep their own styling (non-goal).
- The diagram is model data. Switching theme never re-imports the XML, changes the selection, or clears a check result.
- shadcn components are copied into `src/components/ui/` (that is how shadcn works). Only components the app uses are added.

## Scope

- Spec first: new AC-THEME-\* in `docs/specs/invoice-approval-poc.md`, traceability rows in `docs/ai-native-workflow.md`, and one phrase in `AGENTS.md` (UI state may include the selected theme).
- Tooling: Tailwind CSS v4 (`@tailwindcss/vite`), `@/` import alias, `components.json`, shadcn design tokens for light and dark, `src/lib/utils.ts` (`cn`).
- shadcn components used: `button`, `input`, `label`, `card`, `alert`, `badge`, `toggle-group` (or `toggle`). Icons from `lucide-react` (`Sun`, `Moon`).
- `src/theme/`: a small provider and hook for the selected theme, applying the `dark` class and `color-scheme` to `<html>`.
- UI: `ThemeSwitch` in the header; `LanguageSwitch`, toolbar, `PropertiesPanel`, `ValidationPanel`, banners move to shadcn components. EN and PL strings for the switch labels.
- `src/styles.css` keeps only what shadcn cannot express (canvas shell, bpmn-js overrides, `validation-focus` marker) and is trimmed accordingly.

## Non-goals

- Persisting the theme, following the OS setting, more than two themes.
- A dark skin for the bpmn-js canvas, palette or context pad; the canvas keeps a light surface in dark mode.
- Any change to validation rules, parsing, or what the modeler stores.
- A backend, auth, or database.

## Risks

- Tailwind v4 preflight resets element styles; the bpmn-js canvas and `diagram-js` CSS can be affected. Mitigation: scope checks in the browser at the end and keep bpmn-js CSS imports unchanged.
- Vitest runs with `css: false`, so tests assert the `dark` class and ARIA state, not rendered colors. Real appearance is checked by hand in the browser at the end.
- `npm run check` must stay green with new lint/format rules applied to generated shadcn files (they are formatted with Prettier like the rest).
- New runtime dependencies (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss`, `@tailwindcss/vite`) are required by shadcn and used by the app; none is added unused.

## Implementation Plan

### Phase 1: Spec first

1. Add AC-THEME-1 to AC-THEME-3 to the spec, extend the UI-state sentence in `AGENTS.md`, and add the traceability rows.

### Phase 2: Failing tests

1. Add failing tests in `src/App.test.tsx` for AC-THEME-1 to AC-THEME-3 (default light, switching, no re-import, language and theme independent).

### Phase 3: shadcn foundation

1. Add Tailwind v4, the `@/` alias, `components.json`, `cn`, and the light/dark design tokens.
2. Add the shadcn components the app uses.

### Phase 4: Theme switch

1. Add the theme provider and hook, `ThemeSwitch` with sun and moon icons, and EN/PL strings; the Phase 2 tests pass.

### Phase 5: Migrate the components

1. Move the toolbar, `LanguageSwitch`, `PropertiesPanel`, `ValidationPanel`, and banners in `App.tsx` to shadcn components and trim `src/styles.css`.

### Phase 6: Gate and browser check

1. Run `npm run check` and fix failures.
2. Open the app in a browser; check light, dark, the switch, bpmn-js rendering, and PL.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Spec first

- [x] 1.1 Add AC-THEME criteria, the AGENTS.md phrase, and traceability rows — fb5fb84

### Phase 2: Failing tests

- [x] 2.1 Add failing theme tests — 6f46d64

### Phase 3: shadcn foundation

- [x] 3.1 Add Tailwind, alias, components.json, cn, and tokens — fa58215
- [x] 3.2 Add the shadcn components the app uses — fa58215

### Phase 4: Theme switch

- [ ] 4.1 Add the theme provider, ThemeSwitch, and strings

### Phase 5: Migrate the components

- [ ] 5.1 Move the UI to shadcn components and trim styles.css

### Phase 6: Gate and browser check

- [ ] 6.1 Run the full check
- [ ] 6.2 Check light, dark, and the switch in a browser
