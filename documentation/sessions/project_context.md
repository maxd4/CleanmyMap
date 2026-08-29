# Project Context

## Scope
- Project: CleanMyMap monorepo.
- Deployable applications: `apps/web` and `apps/mobile` in the same CleanMyMap monorepo. `maintenance/python/` remains outside the runtime.

## Stack
- Frontend/API: Next.js (App Router), React, TypeScript.
- Data/backend integration: Supabase.
- Auth: Clerk is the canonical identity for web and mobile. The mobile app uses `ClerkProvider`, `useAuth`, hosted auth and `tokenCache`, then passes the Clerk token to Supabase through Third-Party Auth.
- Main package manager: npm workspaces (`apps/web` and `apps/mobile` workspaces).

## Current architecture anchors
- Public map feed uses the browser client with Supabase RPC `actions_map_feed`.
- Unified action source merges multiple sources in `apps/web/src/lib/actions/unified-source.ts`.
- Role and access controls rely on:
  - `apps/web/src/lib/authz.ts`
  - `apps/web/src/proxy.ts`
  - `apps/web/src/lib/auth/protected-routes.ts`
- Navigation/parcours relies on:
  - `apps/web/src/lib/navigation.ts`
  - `apps/web/src/lib/profiles.ts`
  - `apps/web/src/lib/sections-registry/config.ts`
- Documentation & Visuals:
  - Master System Architecture: `documentation/architecture/master-architecture.md`
  - Visual Assets for DU: `documentation/sessions/assets/`
  - Mermaid Source Codes: `documentation/sessions/assets/SOURCE_SCHEMAS.md`
- Messaging & Engagement (PRO):
  - In-App Chat: `apps/web/src/components/chat/chat-shell.tsx`
  - Chat API: `apps/web/src/app/api/chat/route.ts`
  - Notifications: `apps/web/src/components/navigation/notification-bell.tsx`
  - Newsletter: `apps/web/src/app/api/newsletter/subscribe/route.ts`

## ADR decisions (active)
- Root lockfile is source of truth; `apps/web/package-lock.json` must remain absent.
- `apps/web` and `apps/mobile` are the two deployable applications; `maintenance/python/` remains outside runtime scope.
- Mobile identity, missions/GPS RLS and metric finalization are finalized and frozen. Open topics are only background headless, `mission_actions`, operational validation and future evolution after explicit unfreeze.
- Session memory protocol is mandatory (`AGENTS.md` + `documentation/sessions/project_context.md` + `documentation/sessions/history/latest-session.md`).

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
  - `apps/web/src/lib/admin/audit/operation-audit.ts`
- Messaging & Security Hardening:
  - Rate Limiting: `apps/web/src/lib/community/discussion-rate-limit.ts`
  - Message Pruning: `apps/web/supabase/migrations/20260420000015_advanced_chat_core.sql`
  - Authorized Access: `apps/web/src/lib/authz.ts`
- Homepage & Hero (Protégé) :
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/components/accueil/`

## Repo conventions
- Keep user-facing copy in French unless feature requires otherwise.
- Prefer minimal, localized edits.
- Avoid large refactors in mixed-scope tasks.
- **Homepage restriction**: Ne jamais modifier la homepage sauf demande explicite de l'utilisateur.
- **Browser verification restriction**: Ne pas lancer de vérifications web du rendu du site ni d'inspections navigateur de l'UI sans demande explicite de l'utilisateur.

## Critical validation commands
- Full workspace tests: `npm run test`
- Regression gates: `npm run test:regression-gates`
- Web workspace focused run: `npm -C apps/web run test:regression-gates`

## Session protocol
- Start: read this file and `documentation/sessions/history/latest-session.md`.
- End: update `documentation/sessions/history/latest-session.md` with done, in-progress, next, and risks.
