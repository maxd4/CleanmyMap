-- PURPOSE: keep future school pre-actions out of the public map until a
-- generalized secure geo projection exists; completed approved school
-- actions remain visible with their persisted classification.
-- CALLER: anon/authenticated/service_role through public.actions_map_feed.
-- AUTHORIZATION_BOUNDARY: the wrapper keeps the existing SECURITY INVOKER
-- boundary and public RLS; the legacy implementation is internal only.
-- IDEMPOTENCY: the public function is replaced transactionally and remains a
-- deterministic read projection; no rows are mutated.
-- ATOMICITY: the rename and replacement are one migration transaction.
-- FAILURE_BEHAVIOR: a school pre-action is fail-closed for public map reads;
-- unrelated public actions and spots retain the existing projection.
-- SEARCH_PATH: public, pg_catalog is fixed explicitly.
-- GRANTS: only the public map reader roles and service_role can call the new
-- public function; the renamed implementation is not externally callable.

-- Preserve the already-published projection as an internal implementation so
-- this forward-only migration can add one privacy predicate without copying
-- a second full map-feed owner.
alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) rename to actions_map_feed_context_projection;

revoke all privileges on function public.actions_map_feed_context_projection(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public, anon, authenticated, service_role;

create function public.actions_map_feed(
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_zoom integer default null,
  p_status text default null,
  p_floor_date date default null,
  p_types text[] default null,
  p_impact text default null,
  p_limit integer default 80
)
returns table (
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
select legacy.*
from public.actions_map_feed_context_projection(
  p_south, p_west, p_north, p_east, p_zoom, p_status,
  p_floor_date, p_types, p_impact, p_limit
) as legacy
where not (
  legacy.source = 'actions'
  and exists (
    select 1
    from public.actions a
    where a.id = legacy.id
      and a.action_context = 'school'
      and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'
      and public.is_public_future_pre_action(
        a.action_phase, a.published_at, a.moderation_visibility, a.status,
        a.action_date, a.event_start_time
      )
  )
);
$$;

revoke all privileges on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;
