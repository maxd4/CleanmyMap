-- Validate a pre-action's administrative requirements and its moderation audit
-- entry as one service-only transaction.

create or replace function public.validate_action_administrative_requirements(
  p_action_id uuid,
  p_validated_by_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_status text;
  v_validated_at timestamptz;
  v_previous_requirements jsonb;
  v_next_requirements jsonb;
  v_operation_id text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if p_action_id is null or nullif(btrim(p_validated_by_user_id), '') is null then
    raise exception 'Invalid administrative requirements validation';
  end if;

  -- Serialize retries and concurrent requests for this exact action.
  perform pg_advisory_xact_lock(hashtextextended(p_action_id::text, 0));

  select *
  into v_action
  from public.actions
  where id = p_action_id
  for update;

  if not found then
    raise exception 'Action not found';
  end if;

  if v_action.action_phase <> 'pre_action' then
    raise exception 'Administrative requirements concern pre-actions only';
  end if;

  v_status := v_action.preparation_data #>> '{administrativeRequirements,status}';
  if v_status = 'validated' then
    return jsonb_build_object(
      'alreadyValidated', true,
      'actionId', v_action.id,
      'administrativeRequirements', v_action.preparation_data -> 'administrativeRequirements'
    );
  end if;

  if v_status is not null and v_status <> 'pending' then
    raise exception 'Administrative requirements are not pending';
  end if;

  v_validated_at := timezone('utc', now());
  v_previous_requirements := coalesce(
    v_action.preparation_data -> 'administrativeRequirements',
    jsonb_build_object(
      'status', 'pending',
      'validatedAt', null,
      'validatedByUserId', null
    )
  );
  v_next_requirements := jsonb_build_object(
    'status', 'validated',
    'validatedAt', v_validated_at,
    'validatedByUserId', btrim(p_validated_by_user_id)
  );
  v_operation_id := 'action-administrative-requirements-' || p_action_id::text;

  update public.actions
  set preparation_data = jsonb_set(
    coalesce(preparation_data, '{}'::jsonb),
    '{administrativeRequirements}',
    v_next_requirements,
    true
  )
  where id = p_action_id
    and action_phase = 'pre_action'
    and (
      preparation_data #>> '{administrativeRequirements,status}' is null
      or preparation_data #>> '{administrativeRequirements,status}' = 'pending'
    );

  -- This insert is deliberately in the same function/transaction as the CAS.
  -- Any audit constraint or storage failure rolls back the action update.
  insert into public.admin_operations_audit (
    operation_id,
    at,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    details
  )
  values (
    v_operation_id,
    v_validated_at,
    btrim(p_validated_by_user_id),
    'moderation',
    'success',
    p_action_id::text,
    jsonb_build_object(
      'operation', 'validate_administrative_requirements',
      'actionId', p_action_id,
      'validatedAt', v_validated_at,
      'validatedByUserId', btrim(p_validated_by_user_id),
      'previousValue', v_previous_requirements,
      'newValue', v_next_requirements,
      'previousStatus', 'pending',
      'newStatus', 'validated'
    )
  );

  return jsonb_build_object(
    'alreadyValidated', false,
    'actionId', p_action_id,
    'administrativeRequirements', v_next_requirements
  );
end;
$$;

revoke all on function public.validate_action_administrative_requirements(uuid, text)
  from public, anon, authenticated;
grant execute on function public.validate_action_administrative_requirements(uuid, text)
  to service_role;
