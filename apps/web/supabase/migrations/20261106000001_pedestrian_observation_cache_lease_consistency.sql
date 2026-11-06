-- PURPOSE: keep one lease identity for each claimed batch and reject expired releases.
-- CALLER: service_role worker only; the RPC signatures remain compatible with 00016.
-- AUTHORIZATION_BOUNDARY: service_role is checked inside each SECURITY DEFINER RPC.
-- IDEMPOTENCY: every claim invocation creates a fresh token for its acquisition.
-- ATOMICITY: release validates and locks the complete batch before mutation.
-- FAILURE_BEHAVIOR: any missing, reassigned, duplicate, or expired event aborts the batch.
-- SEARCH_PATH: fixed to pg_catalog, public, extensions.
-- GRANTS: existing service_role-only grants remain valid for the unchanged signatures.

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
declare
  v_lease_token uuid := gen_random_uuid();
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
      lease_token = v_lease_token,
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
  v_owned_events integer := 0;
  v_now timestamptz;
  v_event record;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if nullif(btrim(p_worker_id), '') is null or p_lease_token is null then raise exception 'lease identity required'; end if;
  if p_event_ids is null or cardinality(p_event_ids) = 0 then raise exception 'invalidation lease requires events'; end if;

  v_now := clock_timestamp();
  for v_event in
    select event.*
    from public.pedestrian_risk_cache_invalidation_events event
    where event.id = any(p_event_ids)
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
  if v_owned_events <> cardinality(p_event_ids) then
    raise exception 'invalidation lease is incomplete';
  end if;

  update public.pedestrian_risk_cache_invalidation_events event
  set status = 'pending',
      available_at = timezone('utc', clock_timestamp()) + make_interval(secs => least(3600, 5 * (2 ^ least(attempts, 8)))),
      locked_at = null, locked_by = null, lease_token = null, lease_expires_at = null,
      last_error = left(coalesce(p_error, 'worker failure'), 2000)
  where event.id = any(p_event_ids)
    and event.status = 'processing'
    and event.locked_by = p_worker_id
    and event.lease_token = p_lease_token
    and event.lease_expires_at > v_now;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_event_ids) then
    raise exception 'invalidation lease changed during failure release';
  end if;
  return v_count;
end;
$$;
