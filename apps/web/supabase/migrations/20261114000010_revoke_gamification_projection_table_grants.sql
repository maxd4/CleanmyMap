-- PURPOSE: Keep gamification ledger and profile tables server-only at the SQL privilege boundary.
-- CALLER: Server routes, jobs and RPCs use service_role; browser roles never access these tables directly.
-- AUTHORIZATION_BOUNDARY: PUBLIC, anon and authenticated have no table privilege; service_role keeps ALL.
-- IDEMPOTENCY: REVOKE/GRANT are repeatable privilege operations.
-- ATOMICITY: PostgreSQL applies the privilege changes in the migration transaction.
-- FAILURE_BEHAVIOR: A failed privilege change aborts the migration; no table, data, index, policy or trigger is changed.
-- SEARCH_PATH: Not applicable; fully qualified table names are used.
-- GRANTS: service_role only.

revoke all privileges on table public.progression_events
  from public, anon, authenticated;
revoke all privileges on table public.progression_profiles
  from public, anon, authenticated;

grant all privileges on table public.progression_events to service_role;
grant all privileges on table public.progression_profiles to service_role;
