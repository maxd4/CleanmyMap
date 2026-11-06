-- PURPOSE: reject failed lease releases against the effective post-lock time.
-- CALLER: service_role worker only; the RPC signature remains compatible with 00001.
-- AUTHORIZATION_BOUNDARY: service_role is checked inside this SECURITY DEFINER RPC.
-- IDEMPOTENCY: a release requires the complete, uniquely identified lease batch.
-- ATOMICITY: all rows are locked and revalidated before one all-or-nothing update.
-- FAILURE_BEHAVIOR: missing, duplicated, reassigned, expired, or changed events abort the batch.
-- SEARCH_PATH: fixed to pg_catalog, public, extensions.
-- GRANTS: existing service_role-only grant remains valid for the unchanged signature.

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

  -- Acquire every row first. A caller that waited on any row must not reuse a
  -- timestamp captured before that wait.
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
       or v_event.lease_token is distinct from p_lease_token then
      raise exception 'invalidation lease is not owned by worker';
    end if;
  end loop;
  if v_owned_events <> cardinality(p_event_ids) then
    raise exception 'invalidation lease is incomplete';
  end if;

  -- The lease is checked against a clock read after the complete batch lock.
  v_now := clock_timestamp();
  for v_event in
    select event.*
    from public.pedestrian_risk_cache_invalidation_events event
    where event.id = any(p_event_ids)
    order by event.id
    for update
  loop
    if v_event.status <> 'processing'
       or v_event.locked_by is distinct from p_worker_id
       or v_event.lease_token is distinct from p_lease_token
       or v_event.lease_expires_at is null
       or v_event.lease_expires_at <= v_now then
      raise exception 'invalidation lease is not owned by worker';
    end if;
  end loop;

  -- Re-read the clock at mutation time as well: the batch may expire between
  -- the post-lock validation and this UPDATE statement.
  update public.pedestrian_risk_cache_invalidation_events event
  set status = 'pending',
      available_at = timezone('utc', clock_timestamp()) + make_interval(secs => least(3600, 5 * (2 ^ least(attempts, 8)))),
      locked_at = null, locked_by = null, lease_token = null, lease_expires_at = null,
      last_error = left(coalesce(p_error, 'worker failure'), 2000)
  where event.id = any(p_event_ids)
    and event.status = 'processing'
    and event.locked_by = p_worker_id
    and event.lease_token = p_lease_token
    and event.lease_expires_at > clock_timestamp();
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_event_ids) then
    raise exception 'invalidation lease changed during failure release';
  end if;
  return v_count;
end;
$$;
