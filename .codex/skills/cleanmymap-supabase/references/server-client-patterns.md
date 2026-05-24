# Server Client Patterns

Prefer these patterns when the task touches Supabase from a route handler, server action, or server component:

- `getSupabaseServerClient()` for server-side access
- `getSupabaseServerClient(true)` only when the code path truly needs service role privileges
- route-level Clerk or authz checks before privileged writes
- tests for both the happy path and permission failure

Avoid raw SQL in application code unless the task explicitly targets a migration or DB-level file.
