-- SCIENTIFIC-PROJECTION-VOLUME-PROXY-V2-2026-11
-- PURPOSE: advance the public derived-state identity after the volume proxy
-- changed. Raw action measurements and historical
-- snapshots are not rewritten by this migration.
-- REBUILD: the existing version-aware maintenance path detects the new
-- identity and runs the idempotent rebuild before serving CURRENT state.
-- PARITY: the TypeScript owner is
-- apps/web/src/lib/waste/cigarette-butts.ts; SQL consumes the projected
-- action value and deliberately does not duplicate the volume coefficient.

create or replace function public.current_public_impact_projection_version()
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select 'impact-terrain-public-2026.09-v4'::text;
$$;

alter table public.public_impact_action_contributions
  alter column methodology_version set default public.current_public_impact_projection_version();
alter table public.public_impact_action_aggregate_state
  alter column methodology_version set default public.current_public_impact_projection_version();
