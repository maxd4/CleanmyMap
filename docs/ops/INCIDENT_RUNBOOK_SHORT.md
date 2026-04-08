# Incident Runbook (Auth / Admin / Export)

Last update: 2026-04-09

## Scope
- Authentication and session continuity (`/sign-in`, `/dashboard`)
- Admin access and moderation (`/admin`, `/api/admin/moderation`)
- Export endpoints (`/api/reports/actions.csv`, `/api/reports/actions.json`)

## 1) First 5-minute triage
1. Check deployment health:
   - `GET /api/health`
   - `GET /api/uptime`
2. Confirm active deployment is `Ready` on `main` and correct project root (`apps/web`).
3. Verify user state:
   - signed-in user exists in Clerk Live
   - admin user has `publicMetadata.role = "admin"` or is in `CLERK_ADMIN_USER_IDS`

## 2) Auth/session incident
Symptoms:
- login loop
- OAuth error (`client_id` missing)
- unexpected sign-out after reopen

Checks:
1. Vercel Production env:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` uses `pk_live_...`
   - `CLERK_SECRET_KEY` uses `sk_live_...`
2. Clerk Live domain and redirect paths:
   - `/sign-in`, `/sign-up`, `/dashboard`
3. Google OAuth Live:
   - custom credentials enabled
   - redirect URI includes `https://clerk.cleanmymap.fr/v1/oauth_callback`

Immediate remediation:
1. Fix env/redirect/OAuth mismatch.
2. Redeploy production **without cache**.
3. Retest in private browser window.

## 3) Admin incident
Symptoms:
- `/admin` denied or unreachable for known admin
- moderation UI errors

Checks:
1. Role resolution:
   - Clerk user metadata (`role=admin`) or `CLERK_ADMIN_USER_IDS`
2. API access:
   - `POST /api/admin/moderation` should return JSON, not HTML fallback.
3. Middleware protection:
   - `/admin` and `/api/admin/*` are protected.

Immediate remediation:
1. Reapply admin role in Clerk Live.
2. Ensure `CLERK_ADMIN_USER_IDS` is correct in Production env.
3. Redeploy and retest `/admin` + moderation action.

## 3.1) Clerk Live migration note (admin continuity)
When switching from test to live Clerk instance:
1. Re-check admin users in Clerk Live (`publicMetadata.role = "admin"`).
2. Re-check `CLERK_ADMIN_USER_IDS` in Vercel Production env.
3. Re-test admin access on a fresh browser session.
4. If user profile fields were recreated, confirm UI fallback still resolves identity from Clerk account data.

## 4) Export incident
Symptoms:
- export buttons fail
- CSV/JSON endpoints return unexpected status

Checks:
1. User must be admin for export controls in UI.
2. Validate endpoint responses:
   - `GET /api/reports/actions.csv`
   - `GET /api/reports/actions.json`
3. Check upstream actions data availability (`/api/actions`, `/api/actions/map`).

Immediate remediation:
1. Confirm auth/admin context.
2. Check API payload errors in browser/network.
3. Verify recent schema/data contract changes deployed.

## 5) Post-incident closure
1. Record root cause + remediation applied.
2. Add one preventive check or doc note.
3. Run minimum verification:
   - `npm --prefix apps/web run lint`
   - `npm --prefix apps/web run build`
   - `npm run checks:changed:quick`
4. Confirm supervision panel:
   - `/api/uptime` -> `criticalStatus: "ok"`
   - optional integrations may stay in warning without blocking runtime.
