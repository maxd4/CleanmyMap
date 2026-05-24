# CleanMyMap Web - Backend Ops

## Prerequisites

- Node.js 20+
- `npx supabase` CLI
- `npx vercel` CLI
- Local env file: `.env.local`
- Template d'env: `.env.example`

## Required backend env vars

Les variables `NEXT_PUBLIC_*` sont publiques et peuvent être exposées au navigateur.
Les variables sans préfixe `NEXT_PUBLIC_` doivent rester côté serveur.

Core required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_PROXY_URL` when Clerk must be routed through the app proxy path `/__clerk`
- `CLERK_SECRET_KEY`

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

Deployment locality:

- Vercel Functions are pinned to `cdg1` (Paris) in `apps/web/vercel.json`.
- Keep Supabase, PostHog, and other backend tenants on EU endpoints when the feature is data-bound to France/EU.

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
- Sentry is active when `NEXT_PUBLIC_SENTRY_DSN` is configured. Source-map upload is handled after the Next.js build when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are available.

## Manual commands

```bash
# Push Supabase migrations
npm run backend:supabase:push

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
- Operational reference for every service: [documentation/operations/services-stack.md](../../documentation/operations/services-stack.md)

## PostHog quick setup (local + Vercel)

- Standard env variables:
  - `NEXT_PUBLIC_POSTHOG_KEY` (required)
  - `NEXT_PUBLIC_POSTHOG_HOST` (optional, defaults from region)
  - `NEXT_PUBLIC_POSTHOG_REGION` (`eu` or `us`, default `eu`)
- Backward compatibility:
  - `NEXT_PUBLIC_POSTHOG_TOKEN` is still accepted but deprecated.
- Sentry:
  - `NEXT_PUBLIC_SENTRY_DSN` activates runtime capture on the client and server.
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` enable post-build source-map upload through `sentry-cli`.
  - `SENTRY_RELEASE` can be pinned manually; otherwise the Vercel commit SHA is used when available.
- Local verification:
  - Run `npm run dev`, open the app, then trigger a tracked action (e.g. navigation click).
  - If `localhost:3000` is already taken, the dev launcher automatically uses the next free port so you can keep another local session open at the same time.
  - In PostHog Live Events, confirm events such as `cmm_navigation_click`.
- Vercel verification:
  - Set the same variables in Vercel for Preview and Production.
  - Redeploy, open the deployment URL, trigger an action, and check Live Events.
