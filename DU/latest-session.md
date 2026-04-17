# Latest Session

Updated: 2026-04-17

## Done
- Synced local branch with GitHub, created snapshot commit, and pushed to `origin/main`.
- Executed P0 hygiene:
- Selected root `package-lock.json` as single source of truth.
- Removed `apps/web/package-lock.json` from versioning.
- Added CI lockfile policy workflow and local checker script.
- Deduplicated Figma template generator to a single implementation file.
- Executed P2 page dedup:
- Extracted shared KPI card grid component (`kpi-comparison-grid.tsx`) and replaced duplicated KPI card blocks in `dashboard/page.tsx`.
- Extracted shared 30/90/365 windows panel with unavailable fallback (`kpi-windows-panel.tsx`) and replaced duplicated windows blocks in `reports/page.tsx`.
- Added shared formatting/ordering logic for KPI cards to reduce drift across pages.

## In Progress
- P1 refactor remains open on large TSX files (`actions-report-panel`, `action-declaration-form`).

## Next
- Continue P1 refactor:
- Split `actions-report-panel.tsx` into `useAdminWorkflow` + step subcomponents.
- Split `action-declaration-form.tsx` into form hook + mode sections + payload mapping module.
- Keep each target around ~500 lines with targeted regression checks.

## Risks
- Nested lockfiles can be reintroduced if policy check is bypassed.
- Build artifacts (`.next/`) can pollute local status if not ignored in developer workflows.
