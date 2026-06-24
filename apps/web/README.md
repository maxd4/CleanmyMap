# CleanMyMap Web - Backend Ops

## Prerequisites

- Node.js 20+
- `npx supabase` CLI
- `npx vercel` CLI
- Local env file: `.env.local` (copy from `.env.local.example`)
- Template d'env: `.env.example`

## Required backend env vars

Les variables `NEXT_PUBLIC_*` sont publiques et peuvent être exposées au navigateur.
Les variables sans préfixe `NEXT_PUBLIC_` doivent rester côté serveur.

Core required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE` when you use a dedicated Clerk JWT template for Supabase RLS
- Supabase est auth via JWT Clerk transmis en `accessToken`, pas via `sessionId`.
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_PROXY_URL` only if you intentionally route Clerk through the app proxy path `/__clerk` (otherwise leave it empty and use the direct Clerk frontend API domain)
- `CLERK_SECRET_KEY`
- `CLERK_DOMAIN=auth.cleanmymap.fr` for the Vercel-managed Clerk production domain

Google OAuth is configured in the Clerk Dashboard, not in repo env files. For the Live instance, keep the Google `Client ID` / `Client Secret` in Clerk and use:

- `https://clerk.auth.cleanmymap.fr/v1/oauth_callback`

Localhost dev profile:

- copy `.env.local.example` to `.env.local`
- leave `NEXT_PUBLIC_CLERK_PROXY_URL` empty
- omit `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to use the built-in development fallback
- set `CMM_DEV_AUTH_BYPASS=1`
- set `CMM_DEV_AUTH_BYPASS_ROLE=max` to get the IMU profile locally

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

Preferred deploy path for this repo:

- run `npm run backend:bootstrap` or at minimum `npm run backend:vercel:env:sync` after env changes
- commit the changes
- push `main`
- let Vercel redeploy from GitHub
- avoid `vercel deploy --prod` direct CLI deploys on this repo unless you have explicitly verified the `rootDirectory` behavior first

## Manual commands

```bash
# Push Supabase migrations
npm run backend:supabase:push

# Sync env vars to Vercel
npm run backend:vercel:env:sync

# Doctor check (link + required env presence)
npm run backend:doctor

## Google Sheet -> Supabase sync

Ce flux est désactivé: le document Google Sheet n'est plus utilisé comme source de vérité.
Les anciens imports sont conservés comme historique local, mais il n'y a plus de commande
supportée pour resynchroniser la base depuis cette feuille.

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

## Localhost sanity checks

If the local site looks older than the repository or Turbopack cache errors appear:

0. If the machine is unstable in the browser, do not force a Codex localhost session; use the terminal output and the local browser outside Codex for the visual check.
1. `npm run dev` now starts with Turbopack by default.
2. Webpack remains the stable build path for `npm run build`; use `npm run build:clean` when the cache or manifests look stale.
3. Run `npm run dev:clean` from the repo root to clear `apps/web/.next`.
4. If you need an exact port and want to fail when `3000` is already used, run `npm run dev:strict`.
5. Check the terminal banner before opening the browser. `npm run dev` can fall back to `3001+` when another dev server is still running.
6. If the browser still serves stale content, hard refresh or clear the site data for `localhost`.

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
  - The upload step stages only JavaScript bundles that have a matching `.map` file, which avoids false `missing sourcemap!` warnings and skips third-party CSS maps.
  - Production builds enable `experimental.serverSourceMaps` so server traces can be symbolicated too.
  - The upload step also disables Sentry CLI source-map reference autodetection and rewriting, because Next's generated chunks are paired through debug IDs rather than `sourceMappingURL` comments.
  - On Vercel, the build keeps the original `.map` files on disk so the platform artifact collector does not fail with `ENOENT` while packaging the deployment.
- `SENTRY_RELEASE` can be pinned manually; otherwise the Vercel commit SHA is used when available.
- Standard Clerk mode uses `CLERK_DOMAIN=auth.cleanmymap.fr` and no app proxy.
- Proxy mode is optional and only applies when `NEXT_PUBLIC_CLERK_PROXY_URL=/__clerk` is explicitly set.
- If Google OAuth was recently rotated in Clerk, do not mirror the Google credentials in this repo; only refresh them in Clerk Dashboard and redeploy if needed.
- Local verification:
  - Run `npm run dev`, open the app, then trigger a tracked action (e.g. navigation click).
  - If `localhost:3000` is already taken, the dev launcher automatically uses the next free port so you can keep another local session open at the same time.
  - In PostHog Live Events, confirm events such as `cmm_navigation_click`.
- Vercel verification:
  - Set the same variables in Vercel for Preview and Production.
  - Redeploy, open the deployment URL, trigger an action, and check Live Events.
