-- 20261030000015_feedback_status_audit_reason.sql
-- PURPOSE: preserve the mandatory administrative reason in the atomic feedback status audit.
-- CALLER: server-side PATCH routes through the service-role-only RPC.
-- AUTHORIZATION_BOUNDARY: Clerk AuthN/AuthZ remains in the routes; the RPC accepts service_role only.
-- IDEMPOTENCY: operation_id is locked and an existing audit row returns unchanged without a second mutation or audit.
-- ATOMICITY: the feedback status mutation and its audit insert share this transaction.
-- FAILURE_BEHAVIOR: invalid reasons and state conflicts do not mutate the feedback; conflicts write one bounded error audit.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: the legacy six-argument signature is fail-closed; only the seven-argument signature is executable by service_role.

-- Keep the old SQL symbol discoverable for callers that have not migrated, but make
-- it fail closed so it cannot bypass the mandatory reason validation.
create or replace function public.update_community_bug_report_status(
  p_feedback_id uuid,
  p_status text,
  p_actor_user_id text,
  p_operation_id text,
  p_expected_status text,
  p_expected_creator_state text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Administrative reason is required; use the seven-argument status RPC';
end;
$$;

revoke all on function public.update_community_bug_report_status(uuid, text, text, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.update_community_bug_report_status(
  p_feedback_id uuid,
  p_status text,
  p_reason text,
  p_actor_user_id text,
  p_operation_id text,
  p_expected_status text,
  p_expected_creator_state text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_existing public.admin_operations_audit%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_reason text := nullif(btrim(p_reason), '');
  v_next_creator_state text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if v_actor is null or v_operation is null or v_reason is null
     or char_length(v_reason) < 5 or char_length(v_reason) > 500 then
    raise exception 'Invalid feedback status reason';
  end if;
  if p_status not in ('open', 'treated', 'archived') then
    raise exception 'Invalid feedback status';
  end if;
  v_next_creator_state := case p_status
    when 'open' then 'new'
    when 'treated' then 'treated'
    else 'archived'
  end;

  perform pg_advisory_xact_lock(hashtextextended(v_operation, 0));
  select * into v_existing
    from public.admin_operations_audit
   where operation_id = v_operation
   for update;
  if found then
    select * into v_feedback
      from public.community_bug_reports
     where id = p_feedback_id;
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;

  select * into v_feedback
    from public.community_bug_reports
   where id = p_feedback_id
   for update;
  if not found then
    insert into public.admin_operations_audit(
      operation_id, actor_user_id, operation_type, outcome, target_id, details
    ) values (
      v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text,
      jsonb_build_object(
        'operation', 'feedback_state_changed',
        'reason', v_reason,
        'previousValue', jsonb_build_object('status', 'unknown', 'creatorState', 'unknown'),
        'newValue', jsonb_build_object('status', p_status, 'creatorState', v_next_creator_state)
      )
    );
    return jsonb_build_object('status', 'not_found', 'item', null);
  end if;

  if v_feedback.status is distinct from p_expected_status
     or v_feedback.creator_state is distinct from p_expected_creator_state then
    insert into public.admin_operations_audit(
      operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details
    ) values (
      v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text,
      v_feedback.submitted_by_user_id,
      jsonb_build_object(
        'operation', 'feedback_state_changed',
        'reason', v_reason,
        'previousValue', jsonb_build_object(
          'status', v_feedback.status,
          'creatorState', v_feedback.creator_state
        ),
        'newValue', jsonb_build_object(
          'status', p_status,
          'creatorState', v_next_creator_state
        ),
        'conflict', true
      )
    );
    return jsonb_build_object('status', 'conflict', 'item', to_jsonb(v_feedback));
  end if;

  update public.community_bug_reports
     set status = p_status,
         creator_state = v_next_creator_state
   where id = p_feedback_id;
  select * into v_feedback
    from public.community_bug_reports
   where id = p_feedback_id;

  insert into public.admin_operations_audit(
    operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details
  ) values (
    v_operation, v_actor, 'admin_operation', 'success', p_feedback_id::text,
    v_feedback.submitted_by_user_id,
    jsonb_build_object(
      'operation', 'feedback_state_changed',
      'reason', v_reason,
      'previousValue', jsonb_build_object(
        'status', p_expected_status,
        'creatorState', p_expected_creator_state
      ),
      'newValue', jsonb_build_object(
        'status', p_status,
        'creatorState', v_next_creator_state
      )
    )
  );
  return jsonb_build_object('status', 'updated', 'item', to_jsonb(v_feedback));
end;
$$;

revoke all on function public.update_community_bug_report_status(uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_community_bug_report_status(uuid, text, text, text, text, text, text)
  to service_role;
