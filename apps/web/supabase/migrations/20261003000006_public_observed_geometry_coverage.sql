-- PURPOSE: expose only the derived observed coverage needed by the public map.
-- CALLER: anonymous or authenticated public map readers through actions_map_feed.
-- AUTHORIZATION_BOUNDARY: no contributor identity, mission row, or GPS point is
-- projected; only the action's sanitized MultiLineString coverage is returned.
-- IDEMPOTENCY: this is a deterministic read projection of accepted
-- action_geometry_contributions.
-- ATOMICITY: the replacement function is installed transactionally.
-- FAILURE_BEHAVIOR: the migration fails if the canonical function signature
-- is not present, rather than silently exposing an incompatible result shape.
-- SEARCH_PATH: the public RPC pins public, pg_catalog explicitly.
-- GRANTS: only the existing public map reader roles retain EXECUTE.

drop function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
);

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
  source text,
  entity_type text,
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_clerk_id text,
  status text,
  observed_at date,
  location_label text,
  latitude double precision,
  longitude double precision,
  waste_kg numeric,
  cigarette_butts integer,
  volunteers_count integer,
  duration_minutes integer,
  notes text,
  derived_geometry_kind text,
  derived_geometry_geojson text,
  geometry_confidence numeric,
  geometry_source text,
  observed_coverage jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(
    1,
    least(
      coalesce(p_limit, 80),
      case
        when coalesce(p_zoom, 12) <= 8 then 60
        when coalesce(p_zoom, 12) <= 10 then 120
        when coalesce(p_zoom, 12) <= 12 then 180
        else 300
      end
    )
  ) as value
), action_rows as (
  select
    'actions'::text as source,
    'action'::text as entity_type,
    a.id,
    a.created_at,
    a.updated_at,
    a.created_by_clerk_id,
    'approved'::text as status,
    a.action_date as observed_at,
    a.location_label,
    a.latitude,
    a.longitude,
    a.waste_kg,
    a.cigarette_butts,
    a.volunteers_count,
    a.duration_minutes,
    a.notes,
    a.derived_geometry_kind::text,
    a.derived_geometry_geojson,
    a.geometry_confidence,
    a.geometry_source::text,
    case
      when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
        and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage'
      else null
    end as observed_coverage,
    case
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 80 then 'critique'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 60 then 'fort'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 30 then 'moyen'
      else 'faible'
    end as impact_level
  from public.actions a
  where coalesce(a.moderation_visibility, 'visible') = 'visible'
    and (
      a.status = 'approved'
      or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action')
    )
    and (
      coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
      or public.is_public_future_pre_action(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
    )
    and (p_floor_date is null or a.action_date >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null
    and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select
    'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id,
    s.created_at,
    null::timestamptz as updated_at,
    s.created_by_clerk_id,
    s.status,
    s.created_at::date as observed_at,
    s.label as location_label,
    s.latitude,
    s.longitude,
    null::numeric as waste_kg,
    null::integer as cigarette_butts,
    null::integer as volunteers_count,
    null::integer as duration_minutes,
    s.notes,
    null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson,
    null::numeric as geometry_confidence,
    null::text as geometry_source,
    null::jsonb as observed_coverage,
    'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (
      p_types is null
      or case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end = any(p_types)
    )
    and s.latitude is not null
    and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select
  source, entity_type, id, created_at, updated_at, created_by_clerk_id, status,
  observed_at, location_label, latitude, longitude, waste_kg, cigarette_butts,
  volunteers_count, duration_minutes, notes, derived_geometry_kind,
  derived_geometry_geojson, geometry_confidence, geometry_source,
  observed_coverage
from (
  select * from action_rows
  union all
  select * from spot_rows
) map_rows
where p_impact is null or map_rows.impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

revoke all privileges on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;
