-- Link one private GPS mission to at most one Action without widening the
-- mobile missions INSERT/UPDATE surface. The relation is nullable so
-- autonomous companion missions remain valid.
alter table public.missions
  add column if not exists action_id uuid references public.actions(id) on delete set null;

create index if not exists missions_action_id_idx
  on public.missions(action_id)
  where action_id is not null;

-- The mobile client may create and update only the existing owner-scoped
-- mission fields. Linking and promotion stay server-controlled.
revoke insert (action_id) on public.missions from authenticated;
revoke update (action_id) on public.missions from authenticated;
grant all privileges on table public.missions to service_role;

alter table public.actions
  drop constraint if exists actions_geometry_source_check;

alter table public.actions
  add constraint actions_geometry_source_check
  check (geometry_source in ('manual', 'reference', 'routed', 'estimated_route', 'estimated_area', 'fallback_point', 'gpx_import', 'gps_tracking'));

-- Keep an observed action geometry ahead of later route reconstruction. A
-- tracking observation wins over an older GPX observation; an observed source
-- wins over manual and every reconstructed/estimated source.
create or replace function public.preserve_observed_action_geometry()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  old_source text := old.geometry_source::text;
  new_source text := new.geometry_source::text;
begin
  if old_source = 'gps_tracking'
     and new_source is distinct from 'gps_tracking' then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    new.preparation_data := old.preparation_data;
  elsif old_source = 'gpx_import'
     and coalesce(new_source, '') not in ('gps_tracking', 'gpx_import') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    new.preparation_data := old.preparation_data;
  elsif old_source = 'manual'
     and new_source in ('reference', 'routed', 'estimated_route', 'estimated_area', 'fallback_point') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    new.preparation_data := old.preparation_data;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_observed_action_geometry on public.actions;

create trigger preserve_observed_action_geometry
before update on public.actions
for each row
execute function public.preserve_observed_action_geometry();

-- Promotion runs after the existing invoker-secure completion trigger has
-- filled distance_m/duration_s. SECURITY DEFINER is narrowly bounded to the
-- completed mission row and writes only the public Action projection; the GPS
-- points themselves remain private and are never returned by this trigger.
create or replace function public.promote_completed_mission_geometry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  canonical_mission_id uuid;
  canonical_distance_m integer;
  point_count integer := 0;
  coordinates jsonb;
  next_preparation jsonb;
begin
  if old.status is not distinct from 'completed'
     or new.status is distinct from 'completed'
     or new.action_id is null then
    return new;
  end if;

  -- Several completed field missions may legitimately report the same action.
  -- The earliest completed observation is canonical; the id makes ties stable.
  select m.id, m.distance_m
    into canonical_mission_id, canonical_distance_m
    from public.missions as m
   where m.action_id = new.action_id
     and m.status = 'completed'
     and m.distance_m is not null
   order by m.ended_at asc nulls last, m.id
   limit 1;

  if canonical_mission_id is null then
    return new;
  end if;

  with ordered as (
    select
      gp.latitude,
      gp.longitude,
      gp.recorded_at,
      gp.id,
      lag(gp.latitude) over (order by gp.recorded_at, gp.id) as previous_latitude,
      lag(gp.longitude) over (order by gp.recorded_at, gp.id) as previous_longitude
    from public.gps_points as gp
    where gp.mission_id = canonical_mission_id
      and gp.latitude = gp.latitude
      and gp.longitude = gp.longitude
      and gp.latitude between -90 and 90
      and gp.longitude between -180 and 180
  ), deduplicated as (
    select latitude, longitude, recorded_at, id
    from ordered
    where previous_latitude is null
       or previous_longitude is null
       or latitude <> previous_latitude
       or longitude <> previous_longitude
  )
  select
    count(*)::integer,
    jsonb_agg(
      jsonb_build_array(longitude, latitude)
      order by recorded_at, id
    )
  into point_count, coordinates
  from deduplicated;

  if point_count < 2 or coordinates is null then
    return new;
  end if;

  next_preparation := coalesce(
    (select preparation_data from public.actions where id = new.action_id),
    '{}'::jsonb
  ) - array[
    'gpxImport',
    'operationalRoute',
    'routeNetworkDistanceKm',
    'routeGeometryMode',
    'routeGeometryProvider'
  ]::text[];
  next_preparation := jsonb_set(
    next_preparation,
    '{routeObservedDistanceKm}',
    to_jsonb(round((canonical_distance_m::numeric / 1000), 3)),
    true
  );

  update public.actions
  set derived_geometry_kind = 'polyline',
      derived_geometry_geojson = jsonb_build_object(
        'type', 'LineString',
        'coordinates', coordinates
      )::text,
      geometry_source = 'gps_tracking',
      geometry_confidence = null,
      preparation_data = next_preparation
  where id = new.action_id;

  return new;
end;
$$;

revoke all on function public.promote_completed_mission_geometry() from public;
revoke all on function public.preserve_observed_action_geometry() from public;

drop trigger if exists promote_completed_mission_geometry on public.missions;

create trigger promote_completed_mission_geometry
after update on public.missions
for each row
when (old.status is distinct from 'completed' and new.status = 'completed')
execute function public.promote_completed_mission_geometry();
