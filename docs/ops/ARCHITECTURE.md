# CleanMyMap Architecture Snapshot

## Purpose
This file is the compact context entrypoint for AI/code assistants.
Read this first, then load only task-relevant files.

## Active Surfaces
- Next.js app: `apps/web/src/*` + `apps/web/src/app/api/*`
- Core services: `src/services/*`
- Maintenance/tooling: `scripts/*`, `src/maintenance/*`

## High-Value Entry Files
- `apps/web/src/app/(app)/actions/map/page.tsx`
- `apps/web/src/components/actions/actions-map-feed.tsx`
- `apps/web/src/app/api/actions/map/route.ts`
- `apps/web/src/lib/actions/store.ts`
- `apps/web/src/lib/data/map-records.ts`
- `src/services/data_service.py`
- `src/services/admin_auth.py`
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
