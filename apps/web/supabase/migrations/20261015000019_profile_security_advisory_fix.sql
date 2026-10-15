-- SECURITY/PERF-ADVISORY-01: keep public profile access invoker-scoped and
-- keep the arrondissement lookup privileged without exposing a public
-- SECURITY DEFINER endpoint.
--
-- PURPOSE: remove the public profile view and authenticated SECURITY DEFINER
-- advisor findings without changing the four-column public projection.
-- CALLER: public.public_profiles is read by anon/authenticated consumers;
-- current_profile_arrondissement remains a policy helper.
-- AUTHORIZATION_BOUNDARY: the public facade never reads profiles directly;
-- the private helper derives the caller only from the signed JWT sub claim.
-- IDEMPOTENCY: CREATE OR REPLACE/ALTER/GRANT statements are replay-safe.
-- ATOMICITY: the migration is applied as one PostgreSQL migration.
-- FAILURE_BEHAVIOR: existing function/view names and grants remain intact if
-- a statement fails before the migration commits.
-- SEARCH_PATH: fixed on both functions; all application objects are qualified.
-- GRANTS: authenticated and service_role retain only the existing facade
-- capability; anon remains denied for the function and private helper.

alter view public.public_profiles
  set (security_barrier = true, security_invoker = true);

-- The invoker facade must also work on the existing server-side path. The
-- schema remains unavailable to public and anon; this is only the required
-- namespace lookup privilege for service_role.
grant usage on schema private to service_role;

create or replace function private.current_profile_arrondissement()
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    p.paris_arrondissement,
    public.extract_arrondissement_from_label(p.metadata ->> 'parisArrondissement'),
    public.extract_arrondissement_from_label(p.metadata ->> 'zoneName')
  )
  from public.profiles p
  where p.id = coalesce((select auth.jwt()) ->> 'sub', '')
  limit 1
$$;

revoke all on function private.current_profile_arrondissement()
  from public, anon, authenticated, service_role;
grant execute on function private.current_profile_arrondissement()
  to authenticated, service_role;

create or replace function public.current_profile_arrondissement()
returns integer
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select private.current_profile_arrondissement()
$$;

revoke all on function public.current_profile_arrondissement()
  from public, anon, authenticated, service_role;
grant execute on function public.current_profile_arrondissement()
  to authenticated, service_role;
