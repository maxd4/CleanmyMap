# Clerk Dashboard Session Check (Vercel-managed Clerk integration)

Date: 2026-04-08

## Quick checklist

> Note: the Clerk application is provisioned and linked through the native Vercel + Clerk integration. This checklist verifies the resulting production state; it does not describe a manual Clerk-on-Vercel setup.

1. **Domains**
   - Verify the app URL host is `cleanmymap.fr`.
   - Verify the Vercel-managed Clerk production domain is `auth.cleanmymap.fr`.
   - Verify the Clerk frontend API domain is `clerk.auth.cleanmymap.fr`.
   - Only use a proxy path (`/__clerk`) if the app intentionally routes Clerk through the site domain.

2. **Session lifetime**
   - Check **Maximum session lifetime** and **Inactivity timeout** are aligned with expected user experience.
   - Confirm the values support standard close/reopen browser usage without excessive reconnect.

3. **Remember me / persistent sign-in**
   - Ensure persistent sign-in behavior is enabled according to policy.

4. **Allowed redirect URLs**
   - Confirm sign-in/sign-up redirect URLs include only expected trusted origins.

5. **Environment keys**
   - Confirm publishable/secret keys belong to the same Clerk instance (no mixed environments).
   - Prefer the keys automatically synced by the native Vercel integration; do not recreate them manually in Vercel if the integration is already connected.

6. **Google OAuth on Live instance**
   - In Clerk Live -> Google OAuth, ensure **Use custom credentials** is enabled.
   - Ensure Google OAuth `Client ID` / `Client Secret` are set in Clerk Dashboard only (no empty values, do not commit them to the repo).
   - Ensure Google redirect URI includes:
     - `https://clerk.auth.cleanmymap.fr/v1/oauth_callback`

7. **Admin role continuity after Live migration**
   - Verify admin user has either:
     - `publicMetadata.role = "admin"`, or
     - user id listed in `CLERK_ADMIN_USER_IDS` (Vercel Production env).

## Route access matrix

This matrix summarizes the current route behavior verified in runtime. Keep it aligned with the code whenever Clerk routing changes.

| Route | Access mechanism | No-session behavior | Entry point or CTA |
| --- | --- | --- | --- |
| `/sign-in` | Public auth page | Renders the Clerk sign-in UI directly | `path="/sign-in"` |
| `/sign-up` | Public auth page | Renders the Clerk sign-up UI directly | `path="/sign-up"` |
| `/dashboard` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/admin` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/actions/new` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/prints/report` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/sponsor-portal` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/sections/messagerie` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/sections/community` | Middleware-protected | Redirects to Clerk hosted sign-in with `redirect_url=<current url>` | `https://accounts.auth.cleanmymap.fr/sign-in?...` |
| `/profil` | Soft-gated UI | Keeps the page on the same URL and shows a `Se connecter` CTA | `href="/sign-in"` |
| `/parcours` | Soft-gated UI | Keeps the page on the same URL and shows a `Se connecter` CTA | `href="/sign-in"` |
| `/partners/onboarding` | Soft-gated UI | Keeps the page on the same URL and shows a `Se connecter` CTA | `href="/sign-in"` |
| `/signalement` | Soft-gated UI | Keeps the page on the same URL and shows a `Se connecter` CTA | `href="/sign-in"` |

Notes:

- The middleware-protected routes use the Vercel-managed Clerk hosted sign-in domain, not the local `/sign-in` page.
- The soft-gated routes rely on `ClerkRequiredGate`, so the CTA remains local and can be styled or redirected independently.
- If the Clerk domain or redirect contract changes, update this table together with `apps/web/src/proxy.ts` and the auth pages.
