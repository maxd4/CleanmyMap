-- PURPOSE: Close direct RPC execution of the observed-geometry trigger path.
-- CALLER: PostgreSQL triggers only; no browser, mobile, anon, authenticated, or
-- service_role caller is required for these functions.
-- AUTHORIZATION_BOUNDARY: Trigger execution remains server-side. This migration
-- changes function ACLs only and does not widen table privileges or bypass RLS.
-- IDEMPOTENCY: REVOKE and ALTER FUNCTION are safe to replay for the existing
-- function signatures created by the preceding observed-geometry migrations.
-- ATOMICITY: PostgreSQL applies the ACL and function-configuration statements
-- in the migration transaction; no data rows are changed.
-- FAILURE_BEHAVIOR: If an expected function signature is absent, the migration
-- fails rather than silently leaving a privileged RPC surface open.
-- SEARCH_PATH: The trigger functions retain the bounded `public, pg_catalog`
-- search_path declared by their definitions; all table references are qualified.
-- GRANTS: No EXECUTE grant is retained for PUBLIC, anon, authenticated, or
-- service_role. Trigger invocation does not require a direct RPC grant.

alter function public.promote_completed_mission_geometry()
  set search_path = public, pg_catalog;

alter function public.preserve_observed_action_geometry()
  set search_path = public, pg_catalog;

alter function public.apply_observed_action_geometry(
  public.actions, text, text, numeric, jsonb
)
  set search_path = public, pg_catalog;

revoke all privileges on function public.promote_completed_mission_geometry()
  from public, anon, authenticated, service_role;

revoke all privileges on function public.preserve_observed_action_geometry()
  from public, anon, authenticated, service_role;

revoke all privileges on function public.apply_observed_action_geometry(
  public.actions, text, text, numeric, jsonb
)
  from public, anon, authenticated, service_role;
