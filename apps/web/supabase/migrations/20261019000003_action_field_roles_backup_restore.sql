-- PURPOSE: extend the existing action backup/restore workflow with operational
--          responsibilities without rewriting the published restore migration.
-- CALLER: service_role backup restore command only.
-- AUTHORIZATION_BOUNDARY: the existing restore_action_backup guard remains the
--          authority and the new function is service_role-only.
-- ATOMICITY: the existing restore and field-role rows run in one transaction;
--          any field-role failure rolls back the whole restore call.
-- SEARCH_PATH: fixed to public, pg_catalog.

create or replace function public.restore_action_backup_with_field_roles(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_base jsonb;
  v_role_count integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_backup->'fieldRoleTables' is null then
    return public.restore_action_backup(p_backup);
  end if;
  if jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_assignments') <> 'array'
     or jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_transfer_proposals') <> 'array'
     or jsonb_typeof(p_backup->'fieldRoleTables'->'action_field_role_transfer_audit') <> 'array' then
    raise exception 'Incomplete action field-role backup tables';
  end if;

  v_base := public.restore_action_backup(p_backup);

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

  select count(*) into v_role_count
    from jsonb_array_elements(p_backup->'fieldRoleTables'->'action_field_role_assignments');
  return v_base || jsonb_build_object('field_roles_restored', v_role_count);
end;
$$;

revoke all on function public.restore_action_backup_with_field_roles(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_field_roles(jsonb) to service_role;
