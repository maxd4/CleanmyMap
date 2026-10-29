-- Make the school recognition projection safe to replay without changing the
-- guards, lifecycle checks, or ownership of the canonical reconciliation RPC.
create or replace function public.reconcile_school_action_collective_recognitions(
  p_action_id uuid,
  p_expected_action_updated_at timestamptz,
  p_rows jsonb,
  p_actor_user_id text default null
)
returns table (
  reconciliation_status text,
  active_recognition_ids text[],
  action_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_existing_count integer;
  v_payload_count integer;
  v_payload_distinct_count integer;
  v_eligible boolean;
  v_active_ids text[];
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role is required for school recognition reconciliation';
  end if;

  select *
    into v_action
    from public.actions
   where id = p_action_id
   for update;

  if not found then
    return query select 'not_found'::text, '{}'::text[], null::timestamptz;
    return;
  end if;

  if v_action.updated_at is distinct from p_expected_action_updated_at then
    return query select 'stale'::text, '{}'::text[], v_action.updated_at;
    return;
  end if;

  v_eligible :=
    v_action.action_context = 'school'
    and v_action.school_context_confirmed is true
    and v_action.school_context_confirmed_by_clerk_id is not null
    and (
      v_action.school_context_confirmed_by_clerk_id = v_action.created_by_clerk_id
      or exists (
        select 1
          from public.action_organizers ao
         where ao.action_id = v_action.id
           and ao.organizer_clerk_id = v_action.school_context_confirmed_by_clerk_id
      )
    )
    and v_action.action_phase = 'post_action_complete'
    and v_action.status = 'approved'
    and v_action.published_at is not null
    and v_action.moderation_visibility = 'visible'
    and v_action.access_mode = 'public';

  select count(*)
    into v_existing_count
    from public.action_school_collective_recognitions
   where action_id = p_action_id;

  if not v_eligible and v_existing_count = 0 then
    return query select 'skipped'::text, '{}'::text[], v_action.updated_at;
    return;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'school recognition rows must be a JSON array';
  end if;

  if jsonb_array_length(p_rows) <> 3 then
    raise exception 'school recognition reconciliation requires exactly three rows';
  end if;

  select count(*), count(distinct payload.recognition_id)
    into v_payload_count, v_payload_distinct_count
    from jsonb_to_recordset(p_rows) as payload(
      action_id uuid,
      recognition_id text,
      status text,
      proof_snapshot jsonb,
      invalidated_reason text,
      evaluated_at timestamptz,
      evaluated_by_clerk_id text
    )
   where payload.action_id = p_action_id
     and payload.recognition_id in (
       'school_first_mission',
       'school_documented_sorting',
       'school_field_debrief'
     )
     and payload.status in ('active', 'invalidated');

  if v_payload_count <> 3 or v_payload_distinct_count <> 3 then
    raise exception 'school recognition reconciliation requires exactly three valid rows';
  end if;

  insert into public.action_school_collective_recognitions (
    action_id,
    recognition_id,
    status,
    proof_snapshot,
    invalidated_reason,
    evaluated_at,
    evaluated_by_clerk_id
  )
  select
    p_action_id,
    payload.recognition_id,
    case when v_eligible and payload.status = 'active' then 'active' else 'invalidated' end,
    coalesce(payload.proof_snapshot, '{}'::jsonb),
    case
      when v_eligible and payload.status = 'active' then null
      else coalesce(payload.invalidated_reason, 'Action hors du cadre actif de reconnaissance scolaire.')
    end,
    coalesce(payload.evaluated_at, now()),
    coalesce(payload.evaluated_by_clerk_id, p_actor_user_id)
    from jsonb_to_recordset(p_rows) as payload(
      action_id uuid,
      recognition_id text,
      status text,
      proof_snapshot jsonb,
      invalidated_reason text,
      evaluated_at timestamptz,
      evaluated_by_clerk_id text
    )
   where payload.action_id = p_action_id
  on conflict (action_id, recognition_id)
  do update set
    status = EXCLUDED.status,
    proof_snapshot = EXCLUDED.proof_snapshot,
    invalidated_reason = EXCLUDED.invalidated_reason,
    evaluated_at = EXCLUDED.evaluated_at,
    evaluated_by_clerk_id = EXCLUDED.evaluated_by_clerk_id;

  select coalesce(array_agg(payload.recognition_id order by payload.recognition_id), '{}'::text[])
    into v_active_ids
    from jsonb_to_recordset(p_rows) as payload(
      action_id uuid,
      recognition_id text,
      status text,
      proof_snapshot jsonb,
      invalidated_reason text,
      evaluated_at timestamptz,
      evaluated_by_clerk_id text
    )
   where payload.action_id = p_action_id
     and v_eligible
     and payload.status = 'active';

  return query select 'reconciled'::text, v_active_ids, v_action.updated_at;
end;
$$;

revoke all on function public.reconcile_school_action_collective_recognitions(uuid, timestamptz, jsonb, text) from public, anon, authenticated;
grant execute on function public.reconcile_school_action_collective_recognitions(uuid, timestamptz, jsonb, text) to service_role;

comment on function public.reconcile_school_action_collective_recognitions(uuid, timestamptz, jsonb, text) is
  'Atomically reconciles the three action-scoped school recognition rows after locking the action and rejecting stale snapshots; replay is idempotent, and the function never awards XP or stores student PII.';
