# Feature: Infinite‑Level Gamification Badges

## Goal
Add two infinite‑level badge families ("Masses de déchets" and "Nombre de mégots") that progress every 10 kg and 1000 butts respectively. Clicking a badge opens a modal showing the precise cumulative total retrieved from Supabase. Ensure the badge system works only for authenticated users via Clerk, with a fallback sign‑in prompt when needed.

## User Review Required
- Confirm badge names and French copy (e.g., "Masses de déchets ramassés" and "Nombre de mégots collectés").
- Approve UI placement (profile page badge showcase, tooltip on hover).
- Validate that badge level‑up toasts appear only for logged‑in users.

## Open Questions
- Should badge progress be visible on the homepage summary panel?
- Do we need a fallback UI for unauthenticated visitors (e.g., prompt to sign in with Clerk)?

## Proposed Changes
### Frontend Components
- **[NEW]** `components/gamification/InfiniteBadge.tsx` – renders badge icon, current level, and progress bar.
- **[NEW]** `components/gamification/BadgeModal.tsx` – modal displaying exact total (kg or butts) with a chart.
- **[MODIFY]** `components/sections/rubriques/personal-progress.tsx` – integrate `InfiniteBadge` cards.
- **[MODIFY]** `components/sections/rubriques/gamification/contributor-recognition-panel.tsx` – add infinite badge rows.

### Backend / API
- **[NEW]** `pages/api/gamification/badges/[userId]/totals.ts` – GET returns `{ wasteKg, butts }` from Supabase.
- **[NEW]** `pages/api/gamification/badges/[userId]/increment.ts` – POST increments a user's total (used by client after action completion). Protected by Clerk middleware.

### Supabase / Database
- **[NEW]** Migration `add_user_badge_totals.sql` – creates table `user_badge_totals(user_id uuid PK, waste_kg numeric, butts int)`. The waste and butts columns already exist in the database and will be populated from existing data.
- **[NEW]** RLS policy: allow SELECT/UPDATE only for the authenticated `auth.uid`.
- **[NEW]** Trigger `update_badge_levels` to compute level columns (`waste_level`, `butts_level`) as `floor(waste_kg / 10)` and `floor(butts / 1000)`.

### Supabase Client Helpers
- Extend `apps/web/src/lib/supabase/client.ts` with:
  - `async getBadgeTotals(userId)`
  - `async incrementBadgeTotal(userId, { wasteKg?, butts? })`

### Clerk Integration
- Wrap all badge‑related API calls with `withClerkAuth` middleware to ensure `userId` comes from the signed‑in Clerk session.
- In UI, use `useUser` hook to conditionally render badges; show sign‑in prompt otherwise.

### Tests
- Unit tests for new Supabase helpers (mock client).
- API integration tests checking RLS enforcement.
- Playwright scenario: sign‑in, complete an action, verify badge level increments and toast appears.

## Verification Plan
### Automated Tests
- `npm run test` (Jest) – all unit tests pass.
- `npm run playwright` – badge UI flow works for authenticated user.
- `npm run typecheck` & `npm run lint` – no errors.

### Manual Verification
- Run dev server, sign in via Clerk, perform a waste‑collection action, ensure badge total updates and level‑up toast shows.
- Log out, verify badge components hide and a sign‑in call‑to‑action appears.

---
*Implementation plan finalized. Ready for execution.*
