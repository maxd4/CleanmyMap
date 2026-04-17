# Project Context

## Scope
- Project: CleanMyMap monorepo.
- Active runtime: Next.js app in `apps/web`.
- Legacy Python code is archived in `legacy/` and is not on the active runtime path.

## Stack
- Frontend/API: Next.js (App Router), React, TypeScript.
- Data/backend integration: Supabase.
- Auth: Clerk.
- Main package manager: npm workspaces (`apps/web` workspace).

## Current architecture anchors
- Public map feed uses `/api/actions/map`.
- Unified action source merges multiple sources in `apps/web/src/lib/actions/unified-source.ts`.
- Role and access controls rely on:
  - `apps/web/src/lib/authz.ts`
  - `apps/web/src/proxy.ts`
  - `apps/web/src/lib/auth/protected-routes.ts`
- Navigation/parcours relies on:
  - `apps/web/src/lib/navigation.ts`
  - `apps/web/src/lib/profiles.ts`
  - `apps/web/src/lib/sections-registry.ts`

## Repo conventions
- Keep user-facing copy in French unless feature requires otherwise.
- Prefer minimal, localized edits.
- Avoid large refactors in mixed-scope tasks.

## Critical validation commands
- Full workspace tests: `npm run test`
- Regression gates: `npm run test:regression-gates`
- Web workspace focused run: `npm -C apps/web run test:regression-gates`

## Session protocol
- Start: read this file and `DU/latest-session.md`.
- End: update `DU/latest-session.md` with done, in-progress, next, and risks.
