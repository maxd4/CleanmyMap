# CleanMyMap Architecture Snapshot

## Purpose
This file is the compact context entrypoint for AI/code assistants.
Read this first, then load only task-relevant files.

## Active Surfaces
- Next.js app: `apps/web/src/*` + `apps/web/src/app/api/*`
- Python support modules: `src/report_generator.py`, `src/database.py`, `src/maintenance/*`
- Maintenance/tooling: `scripts/*`

## High-Value Entry Files
- `apps/web/src/app/(app)/actions/map/page.tsx`
- `apps/web/src/components/actions/actions-map-feed.tsx`
- `apps/web/src/app/api/actions/map/route.ts`
- `apps/web/src/lib/actions/store.ts`
- `apps/web/src/lib/data/map-records.ts`
- `src/report_generator.py`

## Context Budget Rules
- Never read full repository by default.
- Start with `git diff --name-only` and targeted `rg`.
- Load at most 3-5 files before first plan/proposal.
- Prefer function-level reads over full-file reads.

## Hard Exclusions (unless explicitly required)
- `apps/web/node_modules/`
- `apps/web/.next/`
- `**/__pycache__/`
- `artifacts/`
- `output/`
- `**/package-lock.json`
- `data/` (except explicit seed files)

## Validation Strategy
- Default: run targeted checks for changed scope.
- Full suite only before release or when touching shared core.

## Production Notes (Web)
- `apps/web/src/app/api/uptime/route.ts` exposes:
  - `criticalStatus`: health for required dependencies (`app`, `supabase`, `clerk`, `clerk_keys`)
  - `optionalStatus`: warnings for optional integrations (`sentry`, others if added)
- Build warnings for Sentry without auth token are non-blocking for runtime:
  - release creation/source-map upload requires `SENTRY_AUTH_TOKEN`
  - app build and runtime remain valid without it.
- Clerk production readiness is validated by:
  - live keys (`pk_live_` / `sk_live_`)
  - application-domain redirects (`/sign-in`, `/sign-up`, `/dashboard`).
- Incident handling quick guide:
  - `docs/ops/INCIDENT_RUNBOOK_SHORT.md`
