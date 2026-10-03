-- Canonical server-side application of an observed action geometry.
-- GPX edits and completed linked missions use the same projection rules:
-- observed distance stays distinct from the planned target and reconstruction
-- metadata is removed from the active geometry without touching the mission's
-- private GPS rows.
create or replace function public.apply_observed_action_geometry(
  p_action public.actions,
  p_source text,
  p_geojson text,
  p_distance_km numeric,
  p_gpx_import jsonb default null
)
returns public.actions
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  next_action public.actions := p_action;
  next_preparation jsonb;
begin
  if p_source not in ('gpx_import', 'gps_tracking') then
    raise exception 'Observed action geometry source is invalid';
  end if;

  -- The web contract validates the LineString coordinates. This guard keeps
  -- the DB primitive from clearing a valid geometry on an incomplete call.
  if p_geojson is null or p_distance_km is null or p_distance_km < 0 then
    return next_action;
  end if;

  next_preparation := coalesce(p_action.preparation_data, '{}'::jsonb) - array[
    'gpxImport',
    'operationalRoute',
    'routeNetworkDistanceKm',
    'routeGeometryMode',
    'routeGeometryProvider'
  ]::text[];
  next_preparation := jsonb_set(
    next_preparation,
    '{routeObservedDistanceKm}',
    to_jsonb(round(p_distance_km::numeric, 3)),
    true
  );
  if p_source = 'gpx_import' and p_gpx_import is not null then
    next_preparation := jsonb_set(
      next_preparation,
      '{gpxImport}',
      p_gpx_import,
      true
    );
  end if;

  next_action.derived_geometry_kind := 'polyline';
  next_action.derived_geometry_geojson := p_geojson;
  next_action.geometry_source := p_source;
  next_action.geometry_confidence := case
    when p_source = 'gpx_import' then 1
    else null
  end;
  next_action.preparation_data := next_preparation;
  return next_action;
end;
$$;

revoke all on function public.apply_observed_action_geometry(
  public.actions, text, text, numeric, jsonb
) from public;

-- An observed-to-observed replacement is only reachable through the
-- authenticated web editor or the server completion trigger. Reconstruction,
-- fallback and manual updates can never displace an observation.
create or replace function public.preserve_observed_action_geometry()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  old_source text := old.geometry_source::text;
  new_source text := new.geometry_source::text;
  next_preparation jsonb;
begin
  if old_source in ('gps_tracking', 'gpx_import')
     and new_source not in ('gps_tracking', 'gpx_import') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    next_preparation := coalesce(new.preparation_data, old.preparation_data, '{}'::jsonb) - array[
      'gpxImport',
      'operationalRoute',
      'routeNetworkDistanceKm',
      'routeGeometryMode',
      'routeGeometryProvider'
    ]::text[];
    if old.preparation_data ? 'routeObservedDistanceKm' then
      next_preparation := jsonb_set(
        next_preparation,
        '{routeObservedDistanceKm}',
        old.preparation_data -> 'routeObservedDistanceKm',
        true
      );
    end if;
    if old_source = 'gpx_import' and old.preparation_data ? 'gpxImport' then
      next_preparation := jsonb_set(
        next_preparation,
        '{gpxImport}',
        old.preparation_data -> 'gpxImport',
        true
      );
    end if;
    new.preparation_data := next_preparation;
  elsif new_source in ('gps_tracking', 'gpx_import') then
    new := public.apply_observed_action_geometry(
      new,
      new_source,
      new.derived_geometry_geojson,
      (new.preparation_data ->> 'routeObservedDistanceKm')::numeric,
      case when new_source = 'gpx_import'
        then new.preparation_data -> 'gpxImport'
        else null
      end
    );
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

revoke all on function public.preserve_observed_action_geometry() from public;

-- Reuse the same primitive for a linked mission. The metric remains the
-- server-owned mission distance; gps_points are never exposed by this path.
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
  current_action public.actions;
  next_action public.actions;
begin
  if old.status is not distinct from 'completed'
     or new.status is distinct from 'completed'
     or new.action_id is null then
    return new;
  end if;

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

  select * into current_action
    from public.actions
   where id = new.action_id
   for update;
  if current_action.id is null then
    return new;
  end if;

  -- A second observation is not a silent replacement. An explicit GPX edit
  -- may replace a previous observation through the authenticated action
  -- update path; automatic mission completion only promotes hypotheses.
  if current_action.geometry_source::text in ('gps_tracking', 'gpx_import') then
    return new;
  end if;

  next_action := public.apply_observed_action_geometry(
    current_action,
    'gps_tracking',
    jsonb_build_object(
      'type', 'LineString',
      'coordinates', coordinates
    )::text,
    round((canonical_distance_m::numeric / 1000), 3),
    null
  );

  update public.actions
     set derived_geometry_kind = next_action.derived_geometry_kind,
         derived_geometry_geojson = next_action.derived_geometry_geojson,
         geometry_source = next_action.geometry_source,
         geometry_confidence = next_action.geometry_confidence,
         preparation_data = next_action.preparation_data
   where id = new.action_id;

  return new;
end;
$$;

revoke all on function public.promote_completed_mission_geometry() from public;
