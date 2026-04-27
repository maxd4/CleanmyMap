# Global Instructions

## Operating goals
- Be concise.
- Prefer focused diffs over large rewrites.
- Avoid repeating context already present in repo memory files.
- Optimize for production-ready and maintainable code.

## Mandatory startup context
- Read `project_context.md` before substantial work.
- Read `documentation/sessions/history/latest-session.md` to continue from the latest state.

## Execution rules
- Keep changes scoped to the requested task.
- Do not hide errors; state blockers explicitly.
- Run targeted validations for modified logic.
- Preserve existing behavior unless change is required by the task.
- **Règle Scientifique** : Toujours sourcer et faire apparaître toutes les données, hypothèses et formules de calcul sur le site web à l'endroit dédié (page Méthodologie ou Tooltips).

## Design System & UI

Before any UI changes, read the canonical design documentation:
- **Visual Charter**: `documentation/design/charte-ui-pro-moderne-futuriste.md`
- **Display Modes**: `documentation/design/display-modes-chartes.md` (exhaustif, minimaliste, sobre)
- **Typography**: `documentation/design/TYPOGRAPHY_SYSTEM.md`

### Canonical Components (always use these)
- **Cards**: `CmmCard` from `@/components/ui/cmm-card`
- **Buttons**: `CmmButton` from `@/components/ui/cmm-button`
- **Typography**: Use `cmm-text-h1` through `cmm-text-h4`, `cmm-text-body`, `cmm-text-small`, `cmm-text-caption`
- **Colors**: Use semantic classes `cmm-text-primary`, `cmm-text-secondary`, `cmm-text-muted`, `cmm-text-inverse` (NOT bare `text-primary` which conflicts with Tailwind v4)
- **Surfaces**: Use `cmm-surface`, `cmm-surface-muted`, `cmm-panel`, `cmm-card`

### Display Modes
Access via `useSitePreferences()` hook:
- `exhaustif` (default) - Premium with effects
- `minimaliste` - Essential without excess
- `sobre` - Static accessibility mode

### Typography Rules
- ✅ Use `cmm-text-*` classes and semantic color tokens
- ❌ Never use `text-[10px]`, `text-[11px]`, or arbitrary sizes
- ❌ Never use `font-extrabold` (800)

## Response style
- Short, structured, and action-oriented.
- File references for changed areas.
- Clear next step when relevant.
