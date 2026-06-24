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

5. QA page par page sur une route visible modifiée:
   - lancer la page en local
   - capturer le rendu écran
   - exporter la page avec `.MD this page` via `Alt+M`
   - comparer la capture et l'extraction Markdown
   - corriger la hiérarchie des titres, les CTA, les statistiques, les cartes, les sources/statuts et les attributs accessibles
   - relancer les deux vérifications avant merge

   Référence détaillée :
   - `page-by-page-ui-qa.md`

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
3. QA page par page pour toute route visible touchée :
   - capture écran locale
   - export `.MD this page`
   - comparaison des deux rendus
   - correction avant merge si l'un des deux révèle un défaut de lecture
4. Production post-redeploy smoke (authenticated):
   - sign in with a live Clerk account
   - verify `/dashboard`, `/admin`, `/reports`, `/actions/new`, `/actions/map`
   - verify export endpoints from admin UI (`CSV` + `JSON`)
   - verify `/api/uptime` shows `criticalStatus: "ok"` (optional warnings allowed)

Pass criteria:
- no failing checks in steps 1-2
- no critical functional gap in steps 3-4

## Vercel Build Fast Path

Use this order before starting a long `vercel build` session:

Do not use `next build` as the first diagnostic method.

Expected order:

1. Read the full error log.
2. Classify the failure: TypeScript, import, Next route, Vercel config, cache, Supabase, env vars, Turbopack/Webpack.
3. Run the fast checks: typecheck, lint, targeted tests.
4. Fix grouped errors.
5. Run one full local/sandbox build.
6. Trigger Vercel only once the local/sandbox build is clean.

1. `npm run typecheck -w apps/web`
2. `npm run test:regression-gates -w apps/web`
3. `npm run build -w apps/web`
4. `npm run audit:vercel-quota`
5. `npx vercel build --yes`

Stop after the first repeated failure. Do not relaunch `next build` after every micro-correction. Batch the fixes by category, re-run the fast checks once, then rebuild once.

If the code-level build passes but `vercel build` fails on Windows with `EPERM: operation not permitted, symlink`, do not loop on the same command:

- verify whether the shell can create symlinks;
- retry from an elevated shell or with Windows Developer Mode enabled;
- keep the native `next build` result as the code signal and treat the failure as a packaging/environment issue.

If the build looks stale or manifests are missing, clean the local cache before the next full build:

- `npm run build:clean -w apps/web`
- this deletes `apps/web/.next` and `apps/web/.turbo`, then relaunches the stable Webpack build path
- do not fabricate `.next/server/pages-manifest.json`, `.next/server/proxy.js.nft.json` or any other internal Next.js file by hand

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
2. `npm run build` for `apps/web` uses the stable Webpack path; if it fails, clean the cache first and inspect the post-build manifest copy step before retrying.
3. Stop every running `Node.js JavaScript Runtime` / `next dev` process for this repo.
4. Clear the Next.js cache and restart clean:
   - `npm run dev:clean`
5. If you want to fail fast instead of silently moving to another port:
   - `npm run dev:strict`
6. If the terminal says port `3000` is busy, do not open `3000` by reflex:
   - the launcher may have started on `3001` or higher.
7. If the browser still serves stale content after restart, hard refresh or clear `localhost` site data.

## Build Notes Observed In The Latest Validation

When validating the web workspace:

1. Run the usual quality gates first:
   - `npm run typecheck -w apps/web`
   - `npm run lint -w apps/web`
2. If the build fails on missing Next server manifests, clean the cache once with `npm run build:clean -w apps/web` before retrying the full build.
3. Inspect `apps/web/scripts/ensure-deterministic-routes-manifest.mjs` only for the post-build copy step.
4. Treat `403` on `npm run backend:supabase:advisors -w apps/web` as a permissions issue on the Supabase project, not as a local build regression.
