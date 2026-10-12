-- SPOGOMI geometry ownership follow-up.
-- Preserve independent action geometry when the consolidation projection changes
-- or removes its official reference. Ownership is proven only by the previous
-- reference metadata and an exact match with the installed reference geometry.

-- PURPOSE: prevent SPOGOMI consolidation from replacing or clearing unrelated action geometry.
-- CALLER: the service-role consolidation RPC through the actions update trigger.
-- AUTHORIZATION_BOUNDARY: no direct public execution; the trigger only applies to controlled projection updates.
-- IDEMPOTENCY: repeated projections preserve the same geometry ownership decision.
-- ATOMICITY: evaluated in the surrounding actions update transaction.
-- FAILURE_BEHAVIOR: ambiguous ownership preserves the existing geometry.
-- SEARCH_PATH: explicitly public-qualified objects under public, pg_catalog.
-- GRANTS: no direct execution grant; trigger-owned server boundary.
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
    if new.spogomi_projection_source_hash is not distinct from old.spogomi_projection_source_hash then
      new.preparation_data := old.preparation_data;
    end if;
  elsif new_source in ('gps_tracking', 'gpx_import')
    and new.derived_geometry_kind::text <> 'multiline' then
    new := public.apply_observed_action_geometry(
      new,
      new_source,
      new.derived_geometry_geojson,
      (new.preparation_data ->> 'routeObservedDistanceKm')::numeric,
      case when new_source = 'gpx_import' then new.preparation_data -> 'gpxImport' else null end
    );
  elsif old_source = 'manual'
     and new_source in ('reference', 'routed', 'estimated_route', 'estimated_area', 'fallback_point') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    if new.spogomi_projection_source_hash is not distinct from old.spogomi_projection_source_hash then
      new.preparation_data := old.preparation_data;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_observed_action_geometry() from public, anon, authenticated, service_role;

create or replace function public.preserve_spogomi_independent_geometry()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  previous_reference jsonb := old.preparation_data -> 'spogomiOfficialReference';
  has_existing_geometry boolean := old.derived_geometry_kind is not null
    or old.derived_geometry_geojson is not null
    or old.geometry_source is not null;
  is_previous_spogomi_reference boolean := jsonb_typeof(previous_reference) = 'object'
    and old.geometry_source::text = 'reference'
    and old.derived_geometry_kind::text = 'polyline'
    and old.derived_geometry_geojson is not distinct from (previous_reference -> 'geometryGeojson')::text;
begin
  -- A new projection hash identifies the controlled consolidation write. Ordinary
  -- edits are governed by the existing action ownership and geometry triggers.
  if new.spogomi_projection_source_hash is not distinct from old.spogomi_projection_source_hash then
    return new;
  end if;

  -- A reference source alone is not proof of SPOGOMI ownership. Preserve every
  -- existing geometry unless the previous reference metadata proves that SPOGOMI
  -- installed the exact current reference geometry.
  if has_existing_geometry and not is_previous_spogomi_reference then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
  end if;

  return new;
end;
$$;

revoke all on function public.preserve_spogomi_independent_geometry() from public, anon, authenticated, service_role;

drop trigger if exists trg_preserve_spogomi_independent_geometry on public.actions;
create trigger trg_preserve_spogomi_independent_geometry
before update on public.actions
for each row execute function public.preserve_spogomi_independent_geometry();
