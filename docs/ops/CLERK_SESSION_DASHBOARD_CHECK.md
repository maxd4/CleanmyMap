# Clerk Dashboard Session Check (Manual)

Date: 2026-04-08

## Quick checklist

1. **Domains**
   - Verify the production domain matches the app URL (`NEXT_PUBLIC_APP_URL` host).
   - If using subdomains/satellite apps, verify primary + satellite domains are both configured.

2. **Session lifetime**
   - Check **Maximum session lifetime** and **Inactivity timeout** are aligned with expected user experience.
   - Confirm the values support standard close/reopen browser usage without excessive reconnect.

3. **Remember me / persistent sign-in**
   - Ensure persistent sign-in behavior is enabled according to policy.

4. **Allowed redirect URLs**
   - Confirm sign-in/sign-up redirect URLs include only expected trusted origins.

5. **Environment keys**
   - Confirm publishable/secret keys belong to the same Clerk instance (no mixed environments).
