# Global Instructions

## Operating goals
- Be concise.
- Prefer focused diffs over large rewrites.
- Avoid repeating context already present in repo memory files.
- Optimize for production-ready and maintainable code.
- **Amélioration Continue & Esprit Critique (Kaizen)** : Adopter une mentalité Kaizen EN PERMANENCE. Ne considérez JAMAIS une rubrique comme parfaite. Proposez des améliorations dès qu'une opportunité est détectée. Gardez un regard critique sur le fond (logique) et la forme (UI). Soyez force de proposition pour des nouveautés.

## Mandatory startup context
- Read `documentation/project_context.md` before substantial work.
- Read `documentation/sessions/history/latest-session.md` to continue from the latest state.
- **Modularisation** : Si la tâche implique de modulariser du code, lire `documentation/ai-guides/AI_MODULARIZATION_GUIDE.md` pour le processus complet.
- **Règles Avancées** : Lire `documentation/ai-guides/AI_ADVANCED_RULES.md` pour validation prompts, cohérence et actions pertinentes.
- **Mindset Kaizen** : Lire `documentation/development/AI_MINDSET_KAIZEN.md` pour l'esprit d'amélioration continue (audit Fond & Forme après chaque intervention).

## Execution rules
- Keep changes scoped to the requested task.
- Do not hide errors; state blockers explicitly.
- Run targeted validations for modified logic.
- Preserve existing behavior unless change is required by the task.
- **Règle Scientifique** : Toujours sourcer et faire apparaître toutes les données, hypothèses et formules de calcul sur le site web à l'endroit dédié (page Méthodologie ou Tooltips).

## Design System & UI

Before any UI changes, read the canonical design documentation:
- **Visual Charter**: `documentation/design-system/charte-ui-pro-moderne-futuriste.md`
- **Visual Storytelling**: `documentation/design-system/VISUAL_STORYTELLING.md` (Priorité aux SVG/D3 sur le texte)
- **Display Modes**: `documentation/design-system/display-modes-chartes.md` (exhaustif, minimaliste, sobre)
- **Typography**: `documentation/design-system/TYPOGRAPHY_SYSTEM.md`

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
