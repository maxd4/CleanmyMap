# Testing Guide

## Reproducible Setup

1. Install Python and Node dependencies:
   - `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`

## Run Checks

1. Full validation:
   - `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

2. Fast changed-scope validation:
   - `powershell -ExecutionPolicy Bypass -File scripts/check_changed_quick.ps1`
   - `powershell -ExecutionPolicy Bypass -File scripts/check_changed_quick.ps1 -IncludeBuild` (includes `next build`)

3. Focused low-noise logs:
   - `npm run logs:focus:test`
   - `npm run logs:focus:build`
   - `npm run logs:focus:checks`

4. Python only:
   - `pytest -q`

## Scope Covered

- Python syntax/compile checks
- Unit tests for:
  - admin auth hardening
  - input validation
  - CSV export service
  - PDF generation
  - security sanitization helpers
- Web lint/test/build gates for `apps/web`

## Production Smoke (Short)

After each production redeploy, verify:
- `/sign-in`
- `/dashboard` (authenticated)
- `/admin` (admin account)
- `/actions/new`
- `/actions/map`
- `/reports`
- `/api/health`
- `/api/uptime`

## Minimal Anti-Regression Protocol

Run this sequence for every incremental patch:

1. Local changed-scope checks:
   - `powershell -ExecutionPolicy Bypass -File scripts/check_changed_quick.ps1`
2. Web app quality gates:
   - `npm --prefix apps/web run lint`
   - `npm --prefix apps/web run build`
3. Production post-redeploy smoke (authenticated):
   - sign in with a live Clerk account
   - verify `/dashboard`, `/admin`, `/reports`, `/actions/new`, `/actions/map`
   - verify export endpoints from admin UI (`CSV` + `JSON`)
   - verify `/api/uptime` shows `criticalStatus: "ok"` (optional warnings allowed)

Pass criteria:
- no failing checks in steps 1-2
- no critical functional gap in step 3

## Local Clerk Verification

For web verification on a localhost app without signing in every time:

1. Prefer the automatic dev bypass on `localhost` during `next dev`.
2. For a clean local Clerk setup, copy `apps/web/.env.local.example` to `apps/web/.env.local`, leave `NEXT_PUBLIC_CLERK_PROXY_URL` empty, omit the live `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and set:
   - `CMM_DEV_AUTH_BYPASS=1`
   - `CMM_DEV_AUTH_BYPASS_ROLE=max` for the IMU profile
3. If you need to force it on another local host, set:
   - `CMM_DEV_AUTH_BYPASS=1`
   - `CMM_DEV_AUTH_BYPASS_ROLE=coordinateur` or `admin` depending on the screen you need to inspect
4. For Playwright automation, prefer a saved `storageState` from one real Clerk login when you want to test the protected route itself.
5. If the goal is UX review rather than auth behavior, use the public preview route:
   - `/preview/actions/new`
6. For isolated tests, mock the session/auth server layer instead of depending on live Clerk redirects.

## Localhost Stale Build Troubleshooting

If `localhost` looks older than the GitHub repo or Turbopack logs mention missing cache files:

0. If this machine is bugging out in the browser, do not force a Codex browser session on `localhost`; rely on the terminal logs and the local browser outside Codex for verification.
1. `npm run dev` uses Turbopack by default.
2. Webpack is disabled in this repository.
3. Stop every running `Node.js JavaScript Runtime` / `next dev` process for this repo.
4. Clear the Next.js cache and restart clean:
   - `npm run dev:clean`
5. If you want to fail fast instead of silently moving to another port:
   - `npm run dev:strict`
6. If the terminal says port `3000` is busy, do not open `3000` by reflex:
   - the launcher may have started on `3001` or higher.
7. If the browser still serves stale content after restart, hard refresh or clear `localhost` site data.
