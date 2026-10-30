-- PURPOSE: provide a migration-only compatibility signature for the published
-- 00001 migration on PostgreSQL versions exposing only pg_input_is_valid(text,text).
-- CALLER: the migration runner while replaying the 20261030 migration chain.
-- AUTHORIZATION_BOUNDARY: no browser role can execute this helper.
-- IDEMPOTENCY: this function is created once and removed by the final recovery migration.
-- ATOMICITY: function creation and its restricted privileges are transactional.
-- FAILURE_BEHAVIOR: the chain stops if the compatibility contract cannot be created.
-- SEARCH_PATH: explicit public, pg_catalog; the body resolves the native function explicitly.
-- GRANTS: no PUBLIC, anon, or authenticated execution privilege.

create function public.pg_input_is_valid(p_value text, p_type regtype)
returns boolean
language sql
strict
security invoker
set search_path = public, pg_catalog
as $$
  select pg_catalog.pg_input_is_valid(p_value, p_type::text);
$$;

revoke all on function public.pg_input_is_valid(text, regtype) from public, anon, authenticated;
