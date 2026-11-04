-- PURPOSE: make observation-cache rebuilds transactional and lease-owned.
-- CALLER: the server-side worker with service_role.
-- AUTHORIZATION_BOUNDARY: publication and failure require the current worker
-- lease; no browser role receives execution privileges.
-- IDEMPOTENCY: the existing projection/source-watermark cache identity and
-- event keys remain the idempotency boundaries.
-- ATOMICITY: calculation, cache-version switch and event completion happen in
-- one database transaction; the worker does not transfer the full cache over
-- PostgREST.
-- FAILURE_BEHAVIOR: an expired or replaced lease is rejected; the previous
-- active snapshot remains readable and the current worker may retry/fail it.
-- SEARCH_PATH: SECURITY DEFINER functions pin pg_catalog, public, extensions.
-- GRANTS: service_role-only RPCs.

drop function if exists public.fail_pedestrian_observation_invalidation_events(bigint[], text);
drop function if exists public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[]);

create or replace function public.fail_pedestrian_observation_invalidation_events(
  p_event_ids bigint[],
  p_error text,
  p_worker_id text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker id required'; end if;
  update public.pedestrian_risk_cache_invalidation_events
  set status = 'pending',
      available_at = timezone('utc', now()) + make_interval(secs => least(3600, 5 * (2 ^ least(attempts, 8)))),
      locked_at = null,
      locked_by = null,
      last_error = left(coalesce(p_error, 'worker failure'), 2000)
  where id = any(coalesce(p_event_ids, '{}'::bigint[]))
    and status = 'processing'
    and locked_by = p_worker_id
    and locked_at >= timezone('utc', now()) - interval '5 minutes';
  get diagnostics v_count = row_count;
  if v_count <> cardinality(coalesce(p_event_ids, '{}'::bigint[])) then
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
  p_worker_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_cache_version_id uuid;
  v_previous_cache_version_id uuid;
  v_owned_events integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker id required'; end if;
  if not exists (select 1 from public.pedestrian_risk_projection_versions where id = p_projection_version_id) then raise exception 'unknown projection version'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'cache rows must be an array'; end if;
  select count(*) into v_owned_events
  from public.pedestrian_risk_cache_invalidation_events event
  where event.id = any(coalesce(p_event_ids, '{}'::bigint[]))
    and event.status = 'processing'
    and event.locked_by = p_worker_id
    and event.locked_at >= timezone('utc', now()) - interval '5 minutes';
  if v_owned_events <> cardinality(coalesce(p_event_ids, '{}'::bigint[])) then
    raise exception 'invalidation lease is not owned by worker';
  end if;
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
  update public.pedestrian_risk_cache_invalidation_events
  set status = 'done', locked_at = null, locked_by = null, last_error = null
  where id = any(coalesce(p_event_ids, '{}'::bigint[]))
    and status = 'processing' and locked_by = p_worker_id;
  if not found and cardinality(coalesce(p_event_ids, '{}'::bigint[])) > 0 then
    raise exception 'invalidation lease changed during publication';
  end if;
  return v_cache_version_id;
end;
$$;

create or replace function public.refresh_pedestrian_observation_cache(
  p_projection_version_id uuid,
  p_event_ids bigint[],
  p_worker_id text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_rows jsonb;
  v_affected_ids text[];
  v_refresh_all boolean;
  v_source_watermark timestamptz;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker id required'; end if;
  if not exists (select 1 from public.pedestrian_risk_projection_versions where id = p_projection_version_id) then raise exception 'unknown projection version'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pedestrian-observation-cache:' || p_projection_version_id::text, 0));
  if (select count(*) from public.pedestrian_risk_cache_invalidation_events event
      where event.id = any(coalesce(p_event_ids, '{}'::bigint[]))
        and event.status = 'processing' and event.locked_by = p_worker_id
        and event.locked_at >= timezone('utc', now()) - interval '5 minutes')
     <> cardinality(coalesce(p_event_ids, '{}'::bigint[])) then
    raise exception 'invalidation lease is not owned by worker';
  end if;
  select coalesce(array_agg(segment.projection_segment_id order by segment.projection_segment_id), '{}'::text[])
  into v_affected_ids
  from public.pedestrian_segment_risk_projections segment
  where segment.projection_version_id = p_projection_version_id
    and exists (
      select 1 from public.pedestrian_risk_cache_invalidation_events event
      where event.id = any(coalesce(p_event_ids, '{}'::bigint[]))
        and (event.source_table = 'system' or
          (event.old_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.old_geom::extensions.geography, 25)) or
          (event.new_geom is not null and extensions.st_dwithin(segment.geom::extensions.geography, event.new_geom::extensions.geography, 25)))
    );
  select not exists (
    select 1 from public.pedestrian_observation_cache_versions
    where projection_version_id = p_projection_version_id and status = 'active'
  ) or exists (
    select 1 from public.pedestrian_risk_cache_invalidation_events
    where id = any(coalesce(p_event_ids, '{}'::bigint[])) and source_table = 'system'
  ) into v_refresh_all;
  select coalesce(jsonb_agg(jsonb_build_object(
    'projectionSegmentId', rows.projection_segment_id,
    'observationIds', rows.observation_ids,
    'observedCount', rows.observed_count,
    'latestObservedAt', rows.latest_observed_at
  ) order by rows.projection_segment_id), '[]'::jsonb)
  into v_rows
  from public.compute_pedestrian_observation_cache_rows(
    p_projection_version_id,
    case when v_refresh_all then null else v_affected_ids end
  ) rows;
  select coalesce(max(updated_at), timezone('utc', now())) into v_source_watermark
  from public.trash_spotter_spots where status = 'validated';
  return public.publish_pedestrian_observation_cache(
    p_projection_version_id,
    v_source_watermark,
    v_rows,
    jsonb_build_object('segments', jsonb_array_length(v_rows), 'refreshedSegments', jsonb_array_length(v_rows), 'events', cardinality(coalesce(p_event_ids, '{}'::bigint[]))),
    p_event_ids,
    case when v_refresh_all then null else v_affected_ids end,
    p_worker_id
  );
end;
$$;

revoke all on function public.fail_pedestrian_observation_invalidation_events(bigint[], text, text) from public, anon, authenticated;
revoke all on function public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[], text) from public, anon, authenticated;
revoke all on function public.refresh_pedestrian_observation_cache(uuid, bigint[], text) from public, anon, authenticated;
grant execute on function public.fail_pedestrian_observation_invalidation_events(bigint[], text, text), public.publish_pedestrian_observation_cache(uuid, timestamptz, jsonb, jsonb, bigint[], text[], text), public.refresh_pedestrian_observation_cache(uuid, bigint[], text) to service_role;
