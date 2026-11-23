-- PURPOSE: compose the version-2 restore wrappers so editor grants and the
--          existing field-role, collection and lot data share one transaction.
-- CALLER: authorized action-backup restore CLI through service_role only.
-- AUTHORIZATION_BOUNDARY: reject every non-service_role caller.
-- ATOMICITY: the nested restore and every added relation commit or roll back together.
-- IDEMPOTENCY: existing action-ID overlap guard rejects a repeated restore.
-- FAILURE_BEHAVIOR: incomplete optional relation pairs abort the entire restore.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: no browser-role execute grants; service_role only.

create or replace function public.restore_action_backup_with_form_editors(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_result jsonb;
  v_has_editors boolean := p_backup->'tables' ? 'action_form_editors';
  v_has_audit boolean := p_backup->'tables' ? 'action_form_editor_audit';
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if v_has_editors is distinct from v_has_audit then
    raise exception 'Incomplete action form editor backup tables';
  end if;

  v_result := public.restore_action_backup_with_individual_butts_lots(p_backup);

  update public.actions a
  set collectors_count = r.collectors_count
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid, collectors_count integer)
  where a.id = r.id;

  update public.action_participants ap
  set collection_status = r.collection_status
  from jsonb_to_recordset(p_backup->'tables'->'action_participants') as r(id uuid, collection_status text)
  where ap.id = r.id;

  if p_backup ? 'fieldRoleTables' then
    if jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_assignments') is distinct from 'array'
       or jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_transfer_proposals') is distinct from 'array'
       or jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_transfer_audit') is distinct from 'array' then
      raise exception 'Incomplete action field-role backup tables';
    end if;

    insert into public.action_field_role_assignments (
      id, action_id, user_id, role_code, assignment_status,
      assigned_by_clerk_id, created_at, updated_at
    )
    select r.id, r.action_id, r.user_id, r.role_code, r.assignment_status,
      r.assigned_by_clerk_id, r.created_at, r.updated_at
    from jsonb_to_recordset(p_backup->'fieldRoleTables'->'action_field_role_assignments') as r(
      id uuid, action_id uuid, user_id text, role_code text, assignment_status text,
      assigned_by_clerk_id text, created_at timestamptz, updated_at timestamptz
    );

    insert into public.action_field_role_transfer_proposals (
      id, action_id, current_primary_user_id, successor_user_id,
      proposed_by_clerk_id, status, expires_at, created_at, updated_at,
      decided_at, decided_by_clerk_id, decision_reason
    )
    select r.id, r.action_id, r.current_primary_user_id, r.successor_user_id,
      r.proposed_by_clerk_id, r.status, r.expires_at, r.created_at, r.updated_at,
      r.decided_at, r.decided_by_clerk_id, r.decision_reason
    from jsonb_to_recordset(p_backup->'fieldRoleTables'->'action_field_role_transfer_proposals') as r(
      id uuid, action_id uuid, current_primary_user_id text, successor_user_id text,
      proposed_by_clerk_id text, status text, expires_at timestamptz,
      created_at timestamptz, updated_at timestamptz, decided_at timestamptz,
      decided_by_clerk_id text, decision_reason text
    );

    insert into public.action_field_role_transfer_audit (
      id, action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id, created_at, details
    )
    select r.id, r.action_id, r.proposal_id, r.event_code, r.actor_clerk_id,
      r.previous_primary_user_id, r.next_primary_user_id, r.created_at, r.details
    from jsonb_to_recordset(p_backup->'fieldRoleTables'->'action_field_role_transfer_audit') as r(
      id uuid, action_id uuid, proposal_id uuid, event_code text, actor_clerk_id text,
      previous_primary_user_id text, next_primary_user_id text,
      created_at timestamptz, details jsonb
    );
  end if;

  if v_has_editors then
    if jsonb_typeof(p_backup->'tables'->'action_form_editors') is distinct from 'array'
       or jsonb_typeof(p_backup->'tables'->'action_form_editor_audit') is distinct from 'array' then
      raise exception 'Incomplete action form editor backup tables';
    end if;

    insert into public.action_form_editors(action_id, clerk_user_id, granted_by_clerk_id, granted_at)
    select r.action_id, r.clerk_user_id, r.granted_by_clerk_id, r.granted_at
    from jsonb_to_recordset(p_backup->'tables'->'action_form_editors') as r(
      action_id uuid, clerk_user_id text, granted_by_clerk_id text, granted_at timestamptz
    );

    insert into public.action_form_editor_audit(
      action_id, request_id, actor_clerk_id, target_clerk_id, operation,
      before_granted, after_granted, created_at
    )
    select r.action_id, r.request_id, r.actor_clerk_id, r.target_clerk_id,
      r.operation, r.before_granted, r.after_granted, r.created_at
    from jsonb_to_recordset(p_backup->'tables'->'action_form_editor_audit') as r(
      action_id uuid, request_id uuid, actor_clerk_id text,
      target_clerk_id text, operation text, before_granted boolean,
      after_granted boolean, created_at timestamptz
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.restore_action_backup_with_form_editors(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_form_editors(jsonb) to service_role;
