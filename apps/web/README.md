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

Recommended for production:

- `CLERK_ADMIN_USER_IDS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO` (optional, reply target for outbound emails)
- `RESEND_TEST_TOKEN` (optional, for `/api/send` test endpoint without admin session)
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_REGION` (`eu` by default, `us` if your PostHog project is in US)
- `NEXT_PUBLIC_SENTRY_DSN`

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
  - `RESEND_FROM_EMAIL` (must be on your verified domain, e.g. `contact@mail.cleanmymap.fr`)
- Optional:
  - `RESEND_REPLY_TO` (professional inbox that receives user replies, e.g. `contact@cleanmymap.fr` or Gmail)
  - `RESEND_TEST_TOKEN` to authorize test calls without admin session.

Example:

```bash
curl -X POST http://localhost:3000/api/send \
  -H "content-type: application/json" \
  -H "x-resend-test-token: $RESEND_TEST_TOKEN" \
  -d '{"to":"maxence.deroome@gmail.com","subject":"Hello World","html":"<p>Test OK</p>"}'
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
