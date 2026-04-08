# Sections Routing Status

Last update: 2026-04-08

## Finalized Sections (Active + Implemented)

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

## Pending Sections (Active Route + Fallback Screen)

- None at this time.

## Rule

- Every visible section route must be declared in `apps/web/src/lib/sections-registry.ts`.
- If a section is not finalized, mark `implementation: "pending"` and optionally `pendingNote`.
- The renderer shows a dedicated "section in progress" fallback for pending sections.

## Navigation Source Of Truth

- Navigation labels and grouping are generated from the same registry via:
  - `apps/web/src/lib/sections-registry.ts`
  - `apps/web/src/lib/navigation.ts`
- Locale-aware navigation summary is handled in `apps/web/src/lib/navigation.ts` (`fr` / `en`).
