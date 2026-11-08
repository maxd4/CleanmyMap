-- SPOGOMI: validate IANA schedule zones and reject stale division snapshots.
-- This migration is forward-only; 20261015000024 remains immutable.

-- PURPOSE: atomically configure one event/division schedule from the persisted
-- snapshot supplied by the caller, while preserving every accepted history row.
-- CALLER: the server-only field-operations route after timing AuthZ.
-- AUTHORIZATION_BOUNDARY: service_role only; event/division scope is checked here.
-- IDEMPOTENCY: a caller must provide the current updated_at for an existing row.
-- ATOMICITY: advisory lock, row lock, schedule write and history append share one transaction.
-- FAILURE_BEHAVIOR: stale snapshots, invalid IANA zones and invalid scopes raise before history.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: execute is revoked from public, anon and authenticated, then granted to service_role.

drop function if exists public.spogomi_configure_field_operation(
  uuid, uuid, text, text, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, text, text, text
);

create or replace function public.spogomi_configure_field_operation(
  p_event_id uuid,
  p_division_id uuid,
  p_timezone_name text,
  p_regulation_version text,
  p_official_start_at timestamptz,
  p_collection_limit_at timestamptz,
  p_sorting_limit_at timestamptz,
  p_weighing_start_at timestamptz,
  p_weighing_end_at timestamptz,
  p_actor_clerk_id text,
  p_reason text,
  p_provenance text,
  p_expected_updated_at timestamptz default null
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_operation public.spogomi_field_operations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI field operations are server-only';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, p_division_id), 0));

  if not exists (
    select 1 from public.spogomi_divisions
     where id = p_division_id and event_id = p_event_id
  ) then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI division not found';
  end if;

  if not exists (
    select 1 from pg_timezone_names where name = btrim(coalesce(p_timezone_name, ''))
  ) then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI timezone must be a valid IANA zone';
  end if;

  if length(btrim(coalesce(p_regulation_version, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or length(btrim(coalesce(p_reason, ''))) = 0
     or length(btrim(coalesce(p_provenance, ''))) = 0 then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI operation configuration provenance is required';
  end if;

  select * into v_operation
    from public.spogomi_field_operations
   where event_id = p_event_id and division_id = p_division_id
   for update;

  if found then
    if p_expected_updated_at is null
       or v_operation.updated_at is distinct from p_expected_updated_at then
      raise exception using errcode = '40001', message = 'SPOGOMI field operation conflict: stale schedule snapshot';
    end if;

    update public.spogomi_field_operations
       set timezone_name = btrim(p_timezone_name),
           regulation_version = btrim(p_regulation_version),
           official_start_at = p_official_start_at,
           collection_limit_at = p_collection_limit_at,
           sorting_limit_at = p_sorting_limit_at,
           weighing_start_at = p_weighing_start_at,
           weighing_end_at = p_weighing_end_at,
           updated_by_clerk_id = btrim(p_actor_clerk_id),
           updated_at = now()
     where id = v_operation.id
       and updated_at = p_expected_updated_at
    returning * into v_operation;

    if not found then
      raise exception using errcode = '40001', message = 'SPOGOMI field operation conflict: stale schedule snapshot';
    end if;
  else
    if p_expected_updated_at is not null then
      raise exception using errcode = '40001', message = 'SPOGOMI field operation conflict: schedule was created meanwhile';
    end if;

    insert into public.spogomi_field_operations (
      event_id, division_id, timezone_name, regulation_version,
      official_start_at, collection_limit_at, sorting_limit_at,
      weighing_start_at, weighing_end_at, updated_by_clerk_id
    ) values (
      p_event_id, p_division_id, btrim(p_timezone_name), btrim(p_regulation_version),
      p_official_start_at, p_collection_limit_at, p_sorting_limit_at,
      p_weighing_start_at, p_weighing_end_at, btrim(p_actor_clerk_id)
    )
    on conflict (event_id, division_id) do nothing
    returning * into v_operation;

    if not found then
      raise exception using errcode = '40001', message = 'SPOGOMI field operation conflict: schedule was created meanwhile';
    end if;
  end if;

  insert into public.spogomi_field_operation_history (
    event_id, division_id, operation_id, action, phase, actor_clerk_id,
    reason, provenance, snapshot
  ) values (
    p_event_id, p_division_id, v_operation.id, 'configured', v_operation.phase,
    btrim(p_actor_clerk_id), btrim(p_reason), btrim(p_provenance), to_jsonb(v_operation)
  );

  return to_jsonb(v_operation);
end;
$$;

revoke all on function public.spogomi_configure_field_operation(
  uuid, uuid, text, text, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.spogomi_configure_field_operation(
  uuid, uuid, text, text, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, text, text, text, timestamptz
) to service_role;
