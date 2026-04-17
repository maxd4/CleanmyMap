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
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

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

## Operational safety

- Server Supabase access now requires `SUPABASE_SERVICE_ROLE_KEY` (no anon fallback).
- Operational stores are persisted in Supabase tables via migration:
  - `admin_operations_audit`
  - `funnel_events`
  - `checklist_progress`
  - `runbook_checks`
- Local file fallback is disabled by default (`ALLOW_LOCAL_FILE_STORE_FALLBACK=false`).
- Local action JSON stores are dev-only by default. Production usage requires explicit opt-in (`ALLOW_LOCAL_ACTION_STORE_IN_PROD=true`).
