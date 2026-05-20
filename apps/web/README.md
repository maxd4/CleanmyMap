# CleanMyMap Web - Backend Ops

## Prerequisites

- Node.js 20+
- `npx supabase` CLI
- `npx vercel` CLI
- Local env file: `.env.local`

## Required backend env vars

Core required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional for local Supabase Studio AI features:

- `OPENAI_API_KEY` is read by `apps/web/supabase/config.toml` for local Supabase Studio only.
- Keep this key in local server-side env files such as `.env.local`; do not expose it through `NEXT_PUBLIC_*` or sync it to Vercel.

Recommended for production:

- `CLERK_ADMIN_USER_IDS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CONTACT_EMAIL`
- `NEXT_PUBLIC_CONTACT_EMAIL` for public mailto links and contact labels
- `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO` are still accepted as legacy aliases
- `CREATOR_INBOX_EMAIL` (optional, creator inbox target for operational notifications)
- `VISION_TRAINING_ENABLED` (`1` to reactivate vision training persistence, disabled by default)
- `RESEND_TEST_TOKEN` (optional, for `/api/send` test endpoint without admin session)
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_REGION` (`eu` by default, `us` if your PostHog project is in US)
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_ENABLED` (`1` to reactivate Sentry, disabled by default in this repo)

Important:

- `apps/web/src/lib/env.ts` must not silently fall back to a production Supabase project.
- A missing core env var should fail fast instead of pointing the app at another deployment.
- If you change Supabase project linkage, update `.env.local`, `.env.vercel.local`, and `.vercel/project.json` together.

## One-command backend bootstrap

From `apps/web`:

```bash
npm run backend:bootstrap
```

What it does:

1. Link Vercel project (if not already linked)
2. Push Supabase migrations to remote project
3. Sync env vars from `.env.local` to Vercel (`development`, `production`)

Notes:

- `NEXT_PUBLIC_APP_URL` is not synced to `preview/production` when it is localhost.
- `RESEND_TEST_TOKEN` is never synced.
- Default automation syncs `development` and `production`.  
  For branch-scoped preview envs, run:
  `node scripts/vercel-sync-env.mjs --file=.env.local --environments=preview --preview-branch=<branch-name>`
- Sentry stays paused unless `NEXT_PUBLIC_SENTRY_ENABLED=1` is set.
- Keep `node scripts/vercel-sync-env.mjs` public by default. Use `--include-secrets` only with an explicit reason and review.
- `OPENAI_API_KEY` is not part of the Vercel sync set for this repo; keep it local to Supabase Studio or the server environment that actually needs it.

## Quality audit snapshot

Etat vérifié au 2026-05-19 pour le prochain passage qualité:

- `npm run typecheck -w apps/web` passe.
- `npm run test:security -w apps/web` passe.
- `npm run lint -w apps/web` passe avec warnings tolérés en développement.
- Les anciens runs/deployments GitHub obsolètes ont été purgés.
- Le backlog court à reprendre ensuite est documenté dans [documentation/maintenance/quality-audit-snapshot.md](../../documentation/maintenance/quality-audit-snapshot.md).

## Manual commands

```bash
# Push Supabase migrations
npm run backend:supabase:push

# Run Supabase security advisors automatically:
# - local if Docker/Supabase stack is available
# - linked project fallback otherwise
npm run backend:supabase:advisors

# Sync env vars to Vercel
npm run backend:vercel:env:sync

# Doctor check (link + required env presence)
npm run backend:doctor

# Google Sheet -> Supabase sync (actions + clean places for map)
npm run data:sheet:sync-supabase

# Export Supabase archive to local backups
npm run data:archive:supabase
# Includes table snapshots plus `action-photos` and `chat-attachments`.

# Cleanup old Supabase + local mirror records older than 4 months
npm run data:cleanup:supabase
# Deletes expired rows from Supabase, archives them locally, and prunes the local mirror files.
```

## Runtime diagnostics

- `GET /api/health`
  - returns `200` when backend is ready
  - returns `503` when required backend config or Supabase connectivity is missing
- `GET /api/services`
  - service-by-service status (`ready`, `missing`, `defer`, `external`)

## Supabase advisors without Docker Desktop

- `npm run backend:supabase:advisors` tries the local stack first.
- If Docker Desktop is unavailable or the local stack cannot start, it automatically falls back to the linked Supabase project.
- Use `npm run backend:supabase:advisors:local` only when you explicitly want to force the local stack.
- Use `npm run backend:supabase:advisors:linked` if you only want the linked project report.

## Resend quick test (`/api/send`)

- Required:
  - `RESEND_API_KEY`
  - `EMAIL_FROM` (must use your verified domain, e.g. `CleanMyMap <noreply@cleanmymap.fr>`)
  - `CONTACT_EMAIL` (reply-to and inbox target, e.g. `contact@cleanmymap.fr`)
  - `NEXT_PUBLIC_CONTACT_EMAIL` (public contact value for client-rendered links and labels)
  - Optional:
  - `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO` for backward compatibility with older deployments
  - `CREATOR_INBOX_EMAIL` (creator inbox for operational requests; falls back to `CONTACT_EMAIL`)
  - `RESEND_TEST_TOKEN` to authorize test calls without admin session.

Example:

```bash
curl -X POST http://localhost:3000/api/send \
  -H "content-type: application/json" \
  -H "x-resend-test-token: $RESEND_TEST_TOKEN" \
  -d '{"to":"contact@cleanmymap.fr","subject":"Hello World","html":"<p>Test OK</p>"}'
```

## Operational safety

- **Hardened RLS**: Core tables (`actions`, `spots`, `events`, `rsvps`) are protected by explicit RLS policies (Owner/Admin access).
- **Dual Supabase Clients**: Separation between `Anon` (RLS aware) and `Admin` (Service Role) clients.
- **Service Isolation**: Third-party SDKs (Clerk, Resend, PostHog) are encapsulated in `@/lib/services`.
- **User Sync**: Clerk profiles are automatically mirrored in Supabase for performant joins.
- **Monitoring**: Centralized error handling via `handleApiError` with Sentry and PostHog tracking.
- **Data Integrity**: Explicit check after every Supabase operation to prevent silent failures.

## PostHog quick setup (local + Vercel)

- Standard env variables:
  - `NEXT_PUBLIC_POSTHOG_KEY` (required)
  - `NEXT_PUBLIC_POSTHOG_HOST` (optional, defaults from region)
  - `NEXT_PUBLIC_POSTHOG_REGION` (`eu` or `us`, default `eu`)
- Backward compatibility:
  - `NEXT_PUBLIC_POSTHOG_TOKEN` is still accepted but deprecated.
- Local verification:
  - Run `npm run dev`, open the app, then trigger a tracked action (e.g. navigation click).
  - In PostHog Live Events, confirm events such as `cmm_navigation_click`.
- Vercel verification:
  - Set the same variables in Vercel for Preview and Production.
  - Redeploy, open the deployment URL, trigger an action, and check Live Events.
