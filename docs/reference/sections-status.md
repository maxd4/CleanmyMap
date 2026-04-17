# Sections Routing Status

Last update: 2026-04-09

## Finalized Sections (active + implemented)

- `community`
- `gamification`
- `actors`
- `trash-spotter`
- `route`
- `recycling`
- `climate`
- `weather`
- `compare`
- `guide`
- `kit`
- `sandbox`
- `elus`

## Pending Sections (active route + fallback screen)

- None.

## Source of truth

- Registry: `apps/web/src/lib/sections-registry.ts`
- Navigation model: `apps/web/src/lib/navigation.ts`
- Renderer entrypoint: `apps/web/src/components/sections/section-renderer.tsx`
- Rubrique submodules: `apps/web/src/components/sections/rubriques/*`

## Rule

- Every visible section route must be declared in `sections-registry.ts`.
- If a section is not finalized, set `implementation: "pending"` and optional `pendingNote`.
- Pending sections are rendered through the dedicated fallback UI.
