# Data Governance

Read these files before changing schema, RLS, storage, or server-side data access:

- `../../../documentation/architecture/data-governance.md`
- `../../../documentation/architecture/adr/ADR-001-clerk-auth.md`
- `../../../documentation/architecture/adr/ADR-002-service-role-key.md`
- `../../../documentation/backend/local-storage-vs-supabase-audit.md`
- `../../../documentation/security/supabase-linked-advisories-2026-05-20.md`
- `../../../apps/web/src/lib/supabase/server.ts`
- `../../../apps/web/src/lib/supabase/client.ts`
- `../../../apps/web/src/lib/supabase/clerk-rls.ts`

Use the server client on the server, keep RLS intact, and avoid moving business data into local storage.
