-- PURPOSE: maintain the validated-observation cache beside the canonical
-- theoretical segment projection and invalidate only affected geometry.
-- CALLER: the server-side cache worker with service_role; source triggers only
-- enqueue eligible signalement/cleaning-action mutations.
-- AUTHORIZATION_BOUNDARY: queue/cache tables and RPCs are service_role-only;
-- source-table triggers do not expose data to browser roles.
-- IDEMPOTENCY: event_key and snapshot identity are unique; retries coalesce
-- and publication replaces only the requested snapshot rows.
-- ATOMICITY: cache rows, active-version switch and claimed-event completion are
-- committed by one publication RPC transaction.
-- FAILURE_BEHAVIOR: a failed worker leaves processing events lease-expirable;
-- the previous active cache remains active until the next successful publish.
-- SEARCH_PATH: SECURITY DEFINER functions pin pg_catalog, public, extensions.
-- GRANTS: only service_role receives table and RPC privileges.

create table if not exists public.pedestrian_risk_cache_invalidation_events (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  source_table text not null check (source_table in ('trash_spotter_spots', 'actions', 'system')),
  source_id uuid,
  operation text not null check (operation in ('insert', 'update', 'delete', 'rebuild')),
  reason text not null check (reason in ('observation', 'temporal', 'model', 'network')),
  old_geom extensions.geometry(Geometry, 4326),
  new_geom extensions.geometry(Geometry, 4326),
  source_updated_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pedestrian_risk_cache_invalidation_events_claim_idx
  on public.pedestrian_risk_cache_invalidation_events (status, available_at, id);
create index if not exists pedestrian_risk_cache_invalidation_events_old_geom_idx
  on public.pedestrian_risk_cache_invalidation_events using gist (old_geom);
create index if not exists pedestrian_risk_cache_invalidation_events_new_geom_idx
  on public.pedestrian_risk_cache_invalidation_events using gist (new_geom);

create table if not exists public.pedestrian_observation_cache_versions (
  id uuid primary key default gen_random_uuid(),
  projection_version_id uuid not null references public.pedestrian_risk_projection_versions(id),
  source_watermark timestamptz not null,
  counts jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  status text not null default 'superseded' check (status in ('active', 'superseded')),
  unique (projection_version_id, source_watermark)
);

create unique index if not exists pedestrian_observation_cache_versions_one_active_idx
  on public.pedestrian_observation_cache_versions (projection_version_id)
  where status = 'active';

create table if not exists public.pedestrian_segment_observation_cache (
  cache_version_id uuid not null references public.pedestrian_observation_cache_versions(id) on delete cascade,
  projection_segment_id text not null,
  observation_ids jsonb not null default '[]'::jsonb,
  observed_count integer not null default 0 check (observed_count >= 0),
  latest_observed_at timestamptz,
  primary key (cache_version_id, projection_segment_id)
);

alter table public.pedestrian_risk_cache_invalidation_events enable row level security;
alter table public.pedestrian_observation_cache_versions enable row level security;
alter table public.pedestrian_segment_observation_cache enable row level security;

revoke all on table public.pedestrian_risk_cache_invalidation_events,
  public.pedestrian_observation_cache_versions,
  public.pedestrian_segment_observation_cache
  from public, anon, authenticated;
grant select, insert, update, delete on table public.pedestrian_risk_cache_invalidation_events,
  public.pedestrian_observation_cache_versions,
  public.pedestrian_segment_observation_cache
  to service_role;
grant usage, select on sequence public.pedestrian_risk_cache_invalidation_events_id_seq to service_role;

drop policy if exists pedestrian_risk_cache_invalidation_events_service_role
  on public.pedestrian_risk_cache_invalidation_events;
create policy pedestrian_risk_cache_invalidation_events_service_role
  on public.pedestrian_risk_cache_invalidation_events for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_observation_cache_versions_service_role
  on public.pedestrian_observation_cache_versions;
create policy pedestrian_observation_cache_versions_service_role
  on public.pedestrian_observation_cache_versions for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_segment_observation_cache_service_role
  on public.pedestrian_segment_observation_cache;
create policy pedestrian_segment_observation_cache_service_role
  on public.pedestrian_segment_observation_cache for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function public.pedestrian_observation_geometry(
  p_geojson text,
  p_latitude double precision,
  p_longitude double precision
)
returns extensions.geometry
language plpgsql
immutable
set search_path = pg_catalog, public, extensions
as $$
begin
  if nullif(btrim(p_geojson), '') is not null then
    return extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson), 4326);
  end if;
  if p_latitude is not null and p_longitude is not null then
    return extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326);
  end if;
  return null;
exception when others then
  return null;
end;
$$;

create or replace function public.enqueue_pedestrian_observation_invalidation(
  p_source_table text,
  p_source_id uuid,
  p_operation text,
  p_old_geom extensions.geometry,
  p_new_geom extensions.geometry,
  p_source_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  insert into public.pedestrian_risk_cache_invalidation_events (
    event_key, source_table, source_id, operation, reason,
    old_geom, new_geom, source_updated_at
  ) values (
    md5(concat_ws(':', p_source_table, p_source_id::text, p_operation, p_source_updated_at::text)),
    p_source_table, p_source_id, p_operation, 'observation',
    p_old_geom, p_new_geom, p_source_updated_at
  ) on conflict (event_key) do nothing;
end;
$$;

create or replace function public.enqueue_trash_spotter_observation_invalidation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  old_relevant boolean := false;
  new_relevant boolean := false;
  changed boolean := true;
  source_id uuid;
  source_updated_at timestamptz;
begin
  if tg_op <> 'INSERT' then old_relevant := old.status in ('validated', 'cleaned'); end if;
  if tg_op <> 'DELETE' then new_relevant := new.status in ('validated', 'cleaned'); end if;
  if tg_op = 'UPDATE' then
    changed := old.status is distinct from new.status or
      old.latitude is distinct from new.latitude or
      old.longitude is distinct from new.longitude or
      old.derived_geometry_kind is distinct from new.derived_geometry_kind or
      old.derived_geometry_geojson is distinct from new.derived_geometry_geojson;
  end if;
  if tg_op = 'DELETE' then
    source_id := old.id;
    source_updated_at := old.updated_at;
  else
    source_id := new.id;
    source_updated_at := new.updated_at;
  end if;
  if not changed or not (old_relevant or new_relevant) then
    return coalesce(new, old);
  end if;
  perform public.enqueue_pedestrian_observation_invalidation(
    'trash_spotter_spots',
    source_id,
    lower(tg_op),
    case when old_relevant then public.pedestrian_observation_geometry(old.derived_geometry_geojson, old.latitude, old.longitude) end,
    case when new_relevant then public.pedestrian_observation_geometry(new.derived_geometry_geojson, new.latitude, new.longitude) end,
    source_updated_at
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.enqueue_cleaning_action_observation_invalidation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  old_relevant boolean := false;
  new_relevant boolean := false;
  changed boolean := true;
  source_id uuid;
  source_updated_at timestamptz;
begin
  if tg_op <> 'INSERT' then old_relevant := old.status = 'approved'; end if;
  if tg_op <> 'DELETE' then new_relevant := new.status = 'approved'; end if;
  if tg_op = 'UPDATE' then
    changed := old.status is distinct from new.status or
      old.latitude is distinct from new.latitude or
      old.longitude is distinct from new.longitude or
      old.derived_geometry_kind is distinct from new.derived_geometry_kind or
      old.derived_geometry_geojson is distinct from new.derived_geometry_geojson;
  end if;
  if tg_op = 'DELETE' then
    source_id := old.id;
    source_updated_at := old.updated_at;
  else
    source_id := new.id;
    source_updated_at := new.updated_at;
  end if;
  if not changed or not (old_relevant or new_relevant) then
    return coalesce(new, old);
  end if;
  perform public.enqueue_pedestrian_observation_invalidation(
    'actions',
    source_id,
    lower(tg_op),
    case when old_relevant then public.pedestrian_observation_geometry(old.derived_geometry_geojson, old.latitude, old.longitude) end,
    case when new_relevant then public.pedestrian_observation_geometry(new.derived_geometry_geojson, new.latitude, new.longitude) end,
    source_updated_at
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists pedestrian_trash_spotter_observation_invalidation on public.trash_spotter_spots;
create trigger pedestrian_trash_spotter_observation_invalidation
after insert or update or delete on public.trash_spotter_spots
for each row execute function public.enqueue_trash_spotter_observation_invalidation();

drop trigger if exists pedestrian_cleaning_action_observation_invalidation on public.actions;
create trigger pedestrian_cleaning_action_observation_invalidation
after insert or update or delete on public.actions
for each row execute function public.enqueue_cleaning_action_observation_invalidation();

create or replace function public.claim_pedestrian_observation_invalidation_events(
  p_worker_id text,
  p_limit integer default 50,
  p_lease_seconds integer default 300
)
returns setof public.pedestrian_risk_cache_invalidation_events
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  return query
  with candidates as (
    select id
    from public.pedestrian_risk_cache_invalidation_events
    where (status = 'pending' and available_at <= timezone('utc', now()))
       or (status = 'processing' and locked_at < timezone('utc', now()) - make_interval(secs => p_lease_seconds))
    order by id
    for update skip locked
    limit greatest(1, least(p_limit, 500))
  )
  update public.pedestrian_risk_cache_invalidation_events event
  set status = 'processing', attempts = event.attempts + 1,
      locked_at = timezone('utc', now()), locked_by = p_worker_id,
      last_error = null
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create or replace function public.fail_pedestrian_observation_invalidation_events(
  p_event_ids bigint[],
  p_error text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  update public.pedestrian_risk_cache_invalidation_events
  set status = 'pending', available_at = timezone('utc', now()) + make_interval(secs => least(3600, 5 * (2 ^ least(attempts, 8)))), locked_at = null, locked_by = null, last_error = left(coalesce(p_error, 'worker failure'), 2000)
  where id = any(p_event_ids) and status = 'processing';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.enqueue_pedestrian_risk_cache_rebuild(
  p_reason text,
  p_identity text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_id bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if p_reason not in ('temporal', 'model', 'network') then raise exception 'invalid rebuild reason'; end if;
  insert into public.pedestrian_risk_cache_invalidation_events (
    event_key, source_table, operation, reason, source_updated_at
  ) values (
    md5(concat_ws(':', 'system', p_reason, p_identity)), 'system', 'rebuild', p_reason, timezone('utc', now())
  ) on conflict (event_key) do update set status = 'pending', available_at = timezone('utc', now()), last_error = null
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.publish_pedestrian_observation_cache(
  p_projection_version_id uuid,
  p_source_watermark timestamptz,
  p_rows jsonb,
  p_counts jsonb default '{}'::jsonb,
  p_event_ids bigint[] default '{}',
  p_replace_segment_ids text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_cache_version_id uuid;
  v_previous_cache_version_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if not exists (select 1 from public.pedestrian_risk_projection_versions where id = p_projection_version_id) then raise exception 'unknown projection version'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'cache rows must be an array'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pedestrian-observation-cache:' || p_projection_version_id::text, 0));
  select id into v_previous_cache_version_id
  from public.pedestrian_observation_cache_versions
  where projection_version_id = p_projection_version_id and status = 'active'
  for update;
  update public.pedestrian_observation_cache_versions
  set status = 'superseded'
  where projection_version_id = p_projection_version_id and status = 'active';
  insert into public.pedestrian_observation_cache_versions (projection_version_id, source_watermark, counts, status)
  values (p_projection_version_id, p_source_watermark, coalesce(p_counts, '{}'::jsonb), 'superseded')
  on conflict (projection_version_id, source_watermark) do update set counts = excluded.counts, generated_at = timezone('utc', now()), status = 'superseded'
  returning id into v_cache_version_id;
  if v_cache_version_id = v_previous_cache_version_id then
    delete from public.pedestrian_segment_observation_cache
    where cache_version_id = v_cache_version_id
      and (p_replace_segment_ids is null or projection_segment_id = any(p_replace_segment_ids));
  else
    delete from public.pedestrian_segment_observation_cache where cache_version_id = v_cache_version_id;
    if p_replace_segment_ids is not null and v_previous_cache_version_id is not null then
      insert into public.pedestrian_segment_observation_cache (cache_version_id, projection_segment_id, observation_ids, observed_count, latest_observed_at)
      select v_cache_version_id, previous_row.projection_segment_id, previous_row.observation_ids, previous_row.observed_count, previous_row.latest_observed_at
      from public.pedestrian_segment_observation_cache previous_row
      where previous_row.cache_version_id = v_previous_cache_version_id
        and previous_row.projection_segment_id <> all(p_replace_segment_ids);
    end if;
  end if;
  insert into public.pedestrian_segment_observation_cache (cache_version_id, projection_segment_id, observation_ids, observed_count, latest_observed_at)
  select v_cache_version_id, row_data."projectionSegmentId", coalesce(row_data."observationIds", '[]'::jsonb), coalesce(row_data."observedCount", 0), row_data."latestObservedAt"
  from jsonb_to_recordset(p_rows) as row_data("projectionSegmentId" text, "observationIds" jsonb, "observedCount" integer, "latestObservedAt" timestamptz);
  update public.pedestrian_observation_cache_versions set status = 'active' where id = v_cache_version_id;
  update public.pedestrian_risk_cache_invalidation_events set status = 'done', locked_at = null, locked_by = null, last_error = null where id = any(p_event_ids) and status = 'processing';
  return v_cache_version_id;
end;
$$;

create or replace function public.get_active_pedestrian_observation_cache(
  p_projection_version_id uuid,
  p_segment_ids text[] default null
)
returns table (
  projection_segment_id text,
  observation_ids jsonb,
  observed_count integer,
  latest_observed_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select row_data.projection_segment_id, row_data.observation_ids, row_data.observed_count, row_data.latest_observed_at
  from public.pedestrian_segment_observation_cache row_data
  join public.pedestrian_observation_cache_versions version_data on version_data.id = row_data.cache_version_id
  where version_data.projection_version_id = p_projection_version_id
    and version_data.status = 'active'
    and (p_segment_ids is null or row_data.projection_segment_id = any(p_segment_ids));
$$;

create or replace function public.get_pedestrian_observation_cache_affected_segments(
  p_projection_version_id uuid,
  p_event_ids bigint[]
)
returns table (projection_segment_id text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  return query
  select distinct segment.projection_segment_id
  from public.pedestrian_segment_risk_projections segment
  where segment.projection_version_id = p_projection_version_id
    and exists (
      select 1
      from public.pedestrian_risk_cache_invalidation_events event
      where event.id = any(p_event_ids)
        and (event.source_table = 'system' or
          (event.old_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.old_geom::extensions.geography, 25)) or
          (event.new_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.new_geom::extensions.geography, 25)))
    )
  order by segment.projection_segment_id;
end;
$$;

create or replace function public.compute_pedestrian_observation_cache_rows(
  p_projection_version_id uuid,
  p_segment_ids text[]
)
returns table (
  projection_segment_id text,
  observation_ids jsonb,
  observed_count integer,
  latest_observed_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select segment.projection_segment_id,
    coalesce(jsonb_agg(spot.id::text order by spot.created_at desc, spot.id) filter (where spot.id is not null), '[]'::jsonb),
    count(spot.id)::integer,
    max(spot.created_at)
  from public.pedestrian_segment_risk_projections segment
  left join public.trash_spotter_spots spot
    on spot.status = 'validated'
   and spot.spot_type = 'spot'
   and extensions.st_dwithin(
     segment.geom::extensions.geography,
     public.pedestrian_observation_geometry(spot.derived_geometry_geojson, spot.latitude, spot.longitude)::extensions.geography,
     25
   )
  where segment.projection_version_id = p_projection_version_id
    and (p_segment_ids is null or segment.projection_segment_id = any(p_segment_ids))
  group by segment.projection_segment_id;
$$;

revoke all on function public.pedestrian_observation_geometry(text, double precision, double precision) from public, anon, authenticated;
revoke all on function public.enqueue_pedestrian_observation_invalidation(text, uuid, text, extensions.geometry, extensions.geometry, timestamptz) from public, anon, authenticated;
revoke all on function public.enqueue_pedestrian_risk_cache_rebuild(text, text) from public, anon, authenticated;
revoke all on function public.claim_pedestrian_observation_invalidation_events(text, integer, integer) from public, anon, authenticated;
revoke all on function public.fail_pedestrian_observation_invalidation_events(bigint[], text) from public, anon, authenticated;
revoke all on function public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[]) from public, anon, authenticated;
revoke all on function public.get_active_pedestrian_observation_cache(uuid, text[]) from public, anon, authenticated;
revoke all on function public.get_pedestrian_observation_cache_affected_segments(uuid, bigint[]) from public, anon, authenticated;
revoke all on function public.compute_pedestrian_observation_cache_rows(uuid, text[]) from public, anon, authenticated;
grant execute on function public.enqueue_pedestrian_observation_invalidation(text, uuid, text, extensions.geometry, extensions.geometry, timestamptz), public.enqueue_pedestrian_risk_cache_rebuild(text, text), public.claim_pedestrian_observation_invalidation_events(text, integer, integer), public.fail_pedestrian_observation_invalidation_events(bigint[], text), public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[]), public.get_active_pedestrian_observation_cache(uuid, text[]), public.get_pedestrian_observation_cache_affected_segments(uuid, bigint[]), public.compute_pedestrian_observation_cache_rows(uuid, text[]) to service_role;
