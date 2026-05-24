# Example Server Route Pattern

Use this flow for privileged data access:

1. Verify the caller identity or role.
2. Create the Supabase server client.
3. Read or mutate through the existing helper.
4. Keep the service role on the server only.
5. Add a regression test for the permission boundary.

Example intent:

- Route handler validates auth
- Data access goes through `getSupabaseServerClient()`
- RLS remains the default guardrail
