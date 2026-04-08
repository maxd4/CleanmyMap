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
