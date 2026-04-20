# Project Context

## Scope
- Project: CleanMyMap monorepo.
- Active runtime: Next.js app in `apps/web`. The repository root has been sanitized; all legacy Python code, data, and scripts are archived in `legacy/` and are out of the active runtime path.

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
- Documentation & Visuals:
  - Master System Architecture: `documentation/technical/master-architecture.md`
  - Visual Assets for DU: `documentation/sessions/assets/`
  - Mermaid Source Codes: `documentation/sessions/assets/SOURCE_SCHEMAS.md`
- Messaging & Engagement (PRO):
  - In-App Chat: `apps/web/src/components/chat/chat-shell.tsx`
  - Chat API: `apps/web/src/app/api/chat/route.ts`
  - Notifications: `apps/web/src/components/navigation/notification-bell.tsx`
  - Newsletter: `apps/web/src/app/api/newsletter/subscribe/route.ts`

## ADR decisions (active)
- Root lockfile is source of truth; `apps/web/package-lock.json` must remain absent.
- Active runtime is only `apps/web`; `legacy/` is archive and out of runtime scope.
- Session memory protocol is mandatory (`AGENTS.md` + `project_context.md` + `documentation/sessions/history/latest-session.md`).

## Sensitive zones
- Auth and permissions:
  - `apps/web/src/lib/authz.ts`
  - `apps/web/src/lib/auth/protected-routes.ts`
  - `apps/web/src/proxy.ts`
- Data contracts and ingestion:
  - `apps/web/src/lib/actions/data-contract.ts`
  - `apps/web/src/lib/actions/unified-source.ts`
- Admin and moderation:
  - `apps/web/src/app/api/admin/moderation/route.ts`
  - `apps/web/src/lib/admin/operation-audit.ts`
- Messaging & Security Hardening:
  - Rate Limiting: `apps/web/src/lib/community/discussion-rate-limit.ts`
  - Message Pruning: `apps/web/supabase/migrations/20260420_000015_advanced_chat_core.sql`
  - Authorized Access: `apps/web/src/lib/authz.ts`

## Repo conventions
- Keep user-facing copy in French unless feature requires otherwise.
- Prefer minimal, localized edits.
- Avoid large refactors in mixed-scope tasks.

## Critical validation commands
- Full workspace tests: `npm run test`
- Regression gates: `npm run test:regression-gates`
- Web workspace focused run: `npm -C apps/web run test:regression-gates`

## Session protocol
- Start: read this file and `documentation/sessions/history/latest-session.md`.
- End: update `documentation/sessions/history/latest-session.md` with done, in-progress, next, and risks.
