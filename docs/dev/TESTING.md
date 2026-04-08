# Testing Guide

## Reproducible Setup

1. Install Python and Node dependencies:
   - `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`

## Run Checks

1. Full validation:
   - `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

2. Fast changed-scope validation:
   - `npm run checks:changed:quick`
   - `npm run checks:changed:quick:build` (includes `next build`)

3. Focused low-noise logs:
   - `npm run logs:focus:test`
   - `npm run logs:focus:build`
   - `npm run logs:focus:checks`

4. Python only:
   - `pytest -q`

5. E2E only:
   - `npx.cmd playwright test --config tests/e2e/playwright.config.cjs`

## Scope Covered

- Python syntax/compile checks
- Unit tests for:
  - admin auth hardening
  - input validation
  - CSV export service
  - PDF generation
  - security sanitization helpers
- Critical E2E flows with Playwright

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
   - `npm run checks:changed:quick`
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
