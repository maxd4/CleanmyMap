-- PURPOSE: publish the new cigarette-butt mass proxy in derived projection identity.
-- CALLER: public impact projection reads and maintenance rebuilds.
-- AUTHORIZATION_BOUNDARY: preserve the service_role-only projection version owner.
-- IDEMPOTENCY: CREATE OR REPLACE and default updates are replay-safe.
-- ATOMICITY: identity and defaults change in one transaction; convergence RPCs rebuild version drift.
-- FAILURE_BEHAVIOR: failures abort the migration transaction.
-- SEARCH_PATH: keep the existing fixed trusted search_path.
-- GRANTS: preserve service_role-only execution.

begin;

create or replace function public.current_public_impact_projection_version()
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select 'impact-terrain-public-2026.09-v9'::text;
$$;

revoke all on function public.current_public_impact_projection_version()
  from public, anon, authenticated;
grant execute on function public.current_public_impact_projection_version()
  to service_role;

alter table public.public_impact_action_contributions
  alter column methodology_version set default public.current_public_impact_projection_version();
alter table public.public_impact_action_aggregate_state
  alter column methodology_version set default public.current_public_impact_projection_version();

commit;
