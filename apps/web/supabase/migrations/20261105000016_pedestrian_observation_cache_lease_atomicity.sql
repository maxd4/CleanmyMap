-- PURPOSE: make observation-cache publication belong to one immutable lease acquisition.
-- ATOMICITY: event ownership is locked before publication and checked again before
-- closure; any mismatch aborts the complete transaction.
-- CLOCK: lease expiry is stored at acquisition and checked with clock_timestamp().
-- GRANTS: service_role-only RPCs; the published 00011 migration is immutable.

alter table public.pedestrian_risk_cache_invalidation_events
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz;

drop function if exists public.fail_pedestrian_observation_invalidation_events(bigint[], text, text);
drop function if exists public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[], text);
drop function if exists public.refresh_pedestrian_observation_cache(uuid, bigint[], text);

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
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker id required'; end if;
  if p_lease_seconds < 1 then raise exception 'lease duration must be positive'; end if;
  return query
  with candidates as (
    select id
    from public.pedestrian_risk_cache_invalidation_events
    where (status = 'pending' and available_at <= clock_timestamp())
       or (status = 'processing' and coalesce(lease_expires_at, locked_at + interval '5 minutes') <= clock_timestamp())
    order by id
    for update skip locked
    limit greatest(1, least(p_limit, 500))
  )
  update public.pedestrian_risk_cache_invalidation_events event
  set status = 'processing', attempts = event.attempts + 1,
      locked_at = clock_timestamp(), locked_by = p_worker_id,
      lease_token = gen_random_uuid(),
      lease_expires_at = clock_timestamp() + make_interval(secs => p_lease_seconds),
      last_error = null
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create or replace function public.fail_pedestrian_observation_invalidation_events(
  p_event_ids bigint[],
  p_error text,
  p_worker_id text,
  p_lease_token uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null or p_lease_token is null then raise exception 'lease identity required'; end if;
  if p_event_ids is null or cardinality(p_event_ids) = 0 then raise exception 'invalidation lease requires events'; end if;
  update public.pedestrian_risk_cache_invalidation_events event
  set status = 'pending',
      available_at = timezone('utc', clock_timestamp()) + make_interval(secs => least(3600, 5 * (2 ^ least(attempts, 8)))),
      locked_at = null, locked_by = null, lease_token = null, lease_expires_at = null,
      last_error = left(coalesce(p_error, 'worker failure'), 2000)
  where event.id = any(p_event_ids)
    and event.status = 'processing'
    and event.locked_by = p_worker_id
    and event.lease_token = p_lease_token;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_event_ids) then
    raise exception 'invalidation lease is not owned by worker';
  end if;
  return v_count;
end;
$$;

create or replace function public.publish_pedestrian_observation_cache(
  p_projection_version_id uuid,
  p_source_watermark timestamptz,
  p_rows jsonb,
  p_counts jsonb default '{}'::jsonb,
  p_event_ids bigint[] default '{}',
  p_replace_segment_ids text[] default null,
  p_worker_id text default null,
  p_lease_token uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_cache_version_id uuid;
  v_previous_cache_version_id uuid;
  v_event record;
  v_event_ids bigint[];
  v_expected_events integer;
  v_owned_events integer := 0;
  v_now timestamptz;
  v_closed_events integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null or p_lease_token is null then raise exception 'lease identity required'; end if;
  if p_event_ids is null or cardinality(p_event_ids) = 0 then raise exception 'invalidation lease requires events'; end if;
  if exists (select 1 from unnest(p_event_ids) event_id where event_id is null) then raise exception 'event ids cannot be null'; end if;
  select array_agg(event_id order by event_id) into v_event_ids
  from (select distinct event_id from unnest(p_event_ids) event_id) ids;
  v_expected_events := cardinality(v_event_ids);
  if v_expected_events <> cardinality(p_event_ids) then raise exception 'event ids must be unique'; end if;
  if not exists (select 1 from public.pedestrian_risk_projection_versions where id = p_projection_version_id) then raise exception 'unknown projection version'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'cache rows must be an array'; end if;

  -- The projection lock and event locks are acquired before any cache mutation.
  perform pg_advisory_xact_lock(hashtextextended('pedestrian-observation-cache:' || p_projection_version_id::text, 0));
  v_now := clock_timestamp();
  for v_event in
    select event.*
    from public.pedestrian_risk_cache_invalidation_events event
    where event.id = any(v_event_ids)
    order by event.id
    for update
  loop
    v_owned_events := v_owned_events + 1;
    if v_event.status <> 'processing'
       or v_event.locked_by is distinct from p_worker_id
       or v_event.lease_token is distinct from p_lease_token
       or v_event.lease_expires_at is null
       or v_event.lease_expires_at <= v_now then
      raise exception 'invalidation lease is not owned by worker';
    end if;
  end loop;
  if v_owned_events <> v_expected_events then raise exception 'invalidation lease is incomplete'; end if;

  select id into v_previous_cache_version_id
  from public.pedestrian_observation_cache_versions
  where projection_version_id = p_projection_version_id and status = 'active'
  for update;
  update public.pedestrian_observation_cache_versions
  set status = 'superseded'
  where projection_version_id = p_projection_version_id and status = 'active';
  insert into public.pedestrian_observation_cache_versions (projection_version_id, source_watermark, counts, status)
  values (p_projection_version_id, p_source_watermark, coalesce(p_counts, '{}'::jsonb), 'superseded')
  on conflict (projection_version_id, source_watermark) do update
    set counts = excluded.counts, generated_at = timezone('utc', clock_timestamp()), status = 'superseded'
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

  -- Re-lock and revalidate the complete lot immediately before closure.
  v_now := clock_timestamp();
  v_owned_events := 0;
  for v_event in
    select event.*
    from public.pedestrian_risk_cache_invalidation_events event
    where event.id = any(v_event_ids)
    order by event.id
    for update
  loop
    v_owned_events := v_owned_events + 1;
    if v_event.status <> 'processing'
       or v_event.locked_by is distinct from p_worker_id
       or v_event.lease_token is distinct from p_lease_token
       or v_event.lease_expires_at is null
       or v_event.lease_expires_at <= v_now then
      raise exception 'invalidation lease changed during publication';
    end if;
  end loop;
  if v_owned_events <> v_expected_events then raise exception 'invalidation lease changed during publication'; end if;
  update public.pedestrian_risk_cache_invalidation_events
  set status = 'done', locked_at = null, locked_by = null, lease_token = null, lease_expires_at = null, last_error = null
  where id = any(v_event_ids) and status = 'processing' and locked_by = p_worker_id and lease_token = p_lease_token;
  get diagnostics v_closed_events = row_count;
  if v_closed_events <> v_expected_events then raise exception 'invalidation lease changed during publication'; end if;
  return v_cache_version_id;
end;
$$;

create or replace function public.refresh_pedestrian_observation_cache(
  p_projection_version_id uuid,
  p_event_ids bigint[],
  p_worker_id text,
  p_lease_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_rows jsonb;
  v_affected_ids text[];
  v_refresh_all boolean;
  v_source_watermark timestamptz;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null or p_lease_token is null then raise exception 'lease identity required'; end if;
  if p_event_ids is null or cardinality(p_event_ids) = 0 then raise exception 'invalidation lease requires events'; end if;
  if not exists (select 1 from public.pedestrian_risk_projection_versions where id = p_projection_version_id) then raise exception 'unknown projection version'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pedestrian-observation-cache:' || p_projection_version_id::text, 0));
  if (select count(*) from public.pedestrian_risk_cache_invalidation_events event
      where event.id = any(p_event_ids) and event.status = 'processing'
        and event.locked_by = p_worker_id and event.lease_token = p_lease_token
        and event.lease_expires_at > clock_timestamp()) <> cardinality(p_event_ids) then
    raise exception 'invalidation lease is not owned by worker';
  end if;
  select coalesce(array_agg(segment.projection_segment_id order by segment.projection_segment_id), '{}'::text[])
  into v_affected_ids
  from public.pedestrian_segment_risk_projections segment
  where segment.projection_version_id = p_projection_version_id
    and exists (
      select 1 from public.pedestrian_risk_cache_invalidation_events event
      where event.id = any(p_event_ids) and (event.source_table = 'system' or
        (event.old_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.old_geom::extensions.geography, 25)) or
        (event.new_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.new_geom::extensions.geography, 25)))
    );
  select not exists (select 1 from public.pedestrian_observation_cache_versions where projection_version_id = p_projection_version_id and status = 'active')
    or exists (select 1 from public.pedestrian_risk_cache_invalidation_events where id = any(p_event_ids) and source_table = 'system') into v_refresh_all;
  select coalesce(jsonb_agg(jsonb_build_object('projectionSegmentId', rows.projection_segment_id, 'observationIds', rows.observation_ids, 'observedCount', rows.observed_count, 'latestObservedAt', rows.latest_observed_at) order by rows.projection_segment_id), '[]'::jsonb)
  into v_rows
  from public.compute_pedestrian_observation_cache_rows(p_projection_version_id, case when v_refresh_all then null else v_affected_ids end) rows;
  select coalesce(max(updated_at), timezone('utc', clock_timestamp())) into v_source_watermark
  from public.trash_spotter_spots where status = 'validated';
  return public.publish_pedestrian_observation_cache(p_projection_version_id, v_source_watermark, v_rows,
    jsonb_build_object('segments', jsonb_array_length(v_rows), 'refreshedSegments', jsonb_array_length(v_rows), 'events', cardinality(p_event_ids)),
    p_event_ids, case when v_refresh_all then null else v_affected_ids end, p_worker_id, p_lease_token);
end;
$$;

revoke all on function public.fail_pedestrian_observation_invalidation_events(bigint[], text, text, uuid) from public, anon, authenticated;
revoke all on function public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[], text, uuid) from public, anon, authenticated;
revoke all on function public.refresh_pedestrian_observation_cache(uuid, bigint[], text, uuid) from public, anon, authenticated;
grant execute on function public.fail_pedestrian_observation_invalidation_events(bigint[], text, text, uuid), public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[], text, uuid), public.refresh_pedestrian_observation_cache(uuid, bigint[], text, uuid) to service_role;
