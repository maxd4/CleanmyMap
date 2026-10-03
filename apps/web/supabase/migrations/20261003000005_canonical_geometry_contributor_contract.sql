-- Canonicalize observed-geometry eligibility and keep every accepted
-- observation attributable through the same contribution table.
-- PURPOSE: unify creator, organizer, confirmed participant, and confirmed
-- registration eligibility for GPX and mobile GPS observations.
-- CALLER: privileged server routes and PostgreSQL triggers only.
-- AUTHORIZATION_BOUNDARY: role names never grant terrain eligibility; the
-- persistent action/participation records are the only authorization facts.
-- IDEMPOTENCY: action_id + contributor_clerk_id + source + source_fingerprint;
-- an accepted identity remains accepted across later eligibility changes.
-- ATOMICITY: contribution upsert and projection refresh execute in the same
-- PostgreSQL transaction; action creation uses an AFTER INSERT trigger.
-- FAILURE_BEHAVIOR: invalid observations are refused; refused observations
-- remain attributable and can be accepted by a later retry when eligible.
-- SEARCH_PATH: SECURITY DEFINER functions pin public, pg_catalog explicitly.
-- GRANTS: only service_role may call the contribution/eligibility RPCs;
-- trigger-only functions retain no direct EXECUTE grant.

create or replace function public.is_action_geometry_contributor_eligible(
  p_action_id uuid,
  p_contributor_clerk_id text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    p_action_id is not null
    and nullif(trim(coalesce(p_contributor_clerk_id, '')), '') is not null
    and (
      exists (
        select 1
        from public.actions a
        where a.id = p_action_id
          and a.created_by_clerk_id = trim(p_contributor_clerk_id)
      )
      or exists (
        select 1
        from public.action_organizers o
        where o.action_id = p_action_id
          and o.organizer_clerk_id = trim(p_contributor_clerk_id)
      )
      or exists (
        select 1
        from public.action_participants p
        where p.action_id = p_action_id
          and p.user_id = trim(p_contributor_clerk_id)
          and p.participation_status = 'confirmed'
      )
      or exists (
        select 1
        from public.action_registrations r
        where r.action_id = p_action_id
          and r.user_id = trim(p_contributor_clerk_id)
          and r.registration_status = 'confirmed'
      )
    );
$$;

revoke all privileges on function public.is_action_geometry_contributor_eligible(uuid, text)
  from public, anon, authenticated;
grant execute on function public.is_action_geometry_contributor_eligible(uuid, text)
  to service_role;

create or replace function public.record_action_geometry_contribution(
  p_action_id uuid,
  p_contributor_clerk_id text,
  p_source text,
  p_observed_geometry jsonb,
  p_observed_distance_km numeric,
  p_source_fingerprint text default null,
  p_mission_id uuid default null,
  p_observed_at timestamptz default timezone('utc', now()),
  p_technical_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  contribution public.action_geometry_contributions;
  existing_state text;
  eligible boolean;
  fingerprint text;
  point_count integer;
  state text;
  refusal text;
begin
  if p_action_id is null
     or nullif(trim(coalesce(p_contributor_clerk_id, '')), '') is null
     or p_source not in ('gpx_import', 'gps_tracking')
     or p_observed_geometry ->> 'type' <> 'LineString'
     or jsonb_typeof(p_observed_geometry -> 'coordinates') <> 'array'
     or jsonb_array_length(p_observed_geometry -> 'coordinates') < 2
     or p_observed_distance_km is null
     or p_observed_distance_km < 0
     or (p_source = 'gps_tracking' and p_mission_id is null) then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_observation');
  end if;

  if not exists (select 1 from public.actions where id = p_action_id) then
    return jsonb_build_object('accepted', false, 'reason', 'action_not_found');
  end if;

  point_count := jsonb_array_length(p_observed_geometry -> 'coordinates');
  fingerprint := coalesce(
    nullif(trim(p_source_fingerprint), ''),
    md5(p_source || ':' || p_observed_geometry::text || ':' || round(p_observed_distance_km, 3)::text)
  );
  select c.validation_state
    into existing_state
    from public.action_geometry_contributions c
   where c.action_id = p_action_id
     and c.contributor_clerk_id = trim(p_contributor_clerk_id)
     and c.source = p_source
     and c.source_fingerprint = fingerprint
   for update;

  eligible := public.is_action_geometry_contributor_eligible(
    p_action_id,
    trim(p_contributor_clerk_id)
  );
  state := case
    when existing_state = 'accepted' or eligible then 'accepted'
    else 'refused'
  end;
  refusal := case
    when state = 'accepted' then null
    else 'contributor_not_eligible_current'
  end;

  insert into public.action_geometry_contributions (
    action_id, contributor_clerk_id, source, mission_id, observed_geometry,
    observed_distance_km, point_count, source_fingerprint, validation_state,
    refusal_reason, observed_at, technical_provenance
  ) values (
    p_action_id, trim(p_contributor_clerk_id), p_source, p_mission_id,
    p_observed_geometry, round(p_observed_distance_km, 3), point_count,
    fingerprint, state, refusal, coalesce(p_observed_at, timezone('utc', now())),
    coalesce(p_technical_provenance, '{}'::jsonb)
  )
  on conflict (action_id, contributor_clerk_id, source, source_fingerprint)
  do update set
    validation_state = case
      when public.action_geometry_contributions.validation_state = 'accepted'
        or excluded.validation_state = 'accepted' then 'accepted'
      else 'refused'
    end,
    refusal_reason = case
      when public.action_geometry_contributions.validation_state = 'accepted'
        or excluded.validation_state = 'accepted' then null
      else excluded.refusal_reason
    end,
    updated_at = timezone('utc', now());

  select * into contribution
    from public.action_geometry_contributions c
   where c.action_id = p_action_id
     and c.contributor_clerk_id = trim(p_contributor_clerk_id)
     and c.source = p_source
     and c.source_fingerprint = fingerprint;

  if contribution.validation_state = 'accepted' then
    perform public.refresh_action_geometry_coverage(p_action_id);
  end if;

  return jsonb_build_object(
    'accepted', contribution.validation_state = 'accepted',
    'contributionId', contribution.id,
    'validationState', contribution.validation_state,
    'reason', contribution.refusal_reason,
    'traceCount', (
      select count(*) from public.action_geometry_contributions
       where action_id = p_action_id and validation_state = 'accepted'
    )
  );
end;
$$;

revoke all privileges on function public.record_action_geometry_contribution(
  uuid, text, text, jsonb, numeric, text, uuid, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.record_action_geometry_contribution(
  uuid, text, text, jsonb, numeric, text, uuid, timestamptz, jsonb
) to service_role;

-- A GPX already present on a newly inserted action is an observation, not a
-- second geometry authority. The creator is the initial attributable actor.
create or replace function public.record_initial_action_geometry_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  observed_geometry jsonb;
  observed_distance_km numeric;
begin
  if new.geometry_source::text <> 'gpx_import'
     or new.created_by_clerk_id is null
     or new.derived_geometry_geojson is null
     or new.preparation_data is null then
    return new;
  end if;

  begin
    observed_geometry := new.derived_geometry_geojson::jsonb;
    observed_distance_km := coalesce(
      (new.preparation_data ->> 'routeObservedDistanceKm')::numeric,
      (new.preparation_data #>> '{gpxImport,observedDistanceKm}')::numeric
    );
  exception when others then
    return new;
  end;

  if observed_geometry ->> 'type' <> 'LineString'
     or jsonb_typeof(observed_geometry -> 'coordinates') <> 'array'
     or jsonb_array_length(observed_geometry -> 'coordinates') < 2
     or observed_distance_km is null
     or observed_distance_km < 0 then
    return new;
  end if;

  perform public.record_action_geometry_contribution(
    new.id,
    new.created_by_clerk_id,
    'gpx_import',
    observed_geometry,
    observed_distance_km,
    null,
    null,
    new.created_at,
    jsonb_build_object('initialActionCreation', true)
  );
  return new;
end;
$$;

revoke all privileges on function public.record_initial_action_geometry_contribution()
  from public, anon, authenticated, service_role;

drop trigger if exists record_initial_action_geometry_contribution on public.actions;
create trigger record_initial_action_geometry_contribution
after insert on public.actions
for each row
execute function public.record_initial_action_geometry_contribution();

-- Any direct action update that carries stale observed columns is repaired from
-- accepted contributions after the row write. The depth guard prevents the
-- canonical refresh UPDATE from recursing.
create or replace function public.refresh_observed_action_geometry_after_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if exists (
    select 1
    from public.action_geometry_contributions c
    where c.action_id = new.id
      and c.validation_state = 'accepted'
  ) then
    perform public.refresh_action_geometry_coverage(new.id);
  end if;
  return new;
end;
$$;

revoke all privileges on function public.refresh_observed_action_geometry_after_update()
  from public, anon, authenticated, service_role;

drop trigger if exists refresh_observed_action_geometry_after_update on public.actions;
create trigger refresh_observed_action_geometry_after_update
after update of derived_geometry_kind, derived_geometry_geojson,
  geometry_source, geometry_confidence, preparation_data on public.actions
for each row
execute function public.refresh_observed_action_geometry_after_update();
