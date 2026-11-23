-- PURPOSE: preserve an assigned team leader when a different attendance entry is removed.
-- CALLER: the existing action attendance mutation RPC through its entry-delete trigger.
-- AUTHORIZATION_BOUNDARY: service_role-only entry RPC; this SECURITY DEFINER trigger helper is not directly executable.
-- IDEMPOTENCY: only transitions from active to soft-deleted entries detach membership.
-- ATOMICITY: membership detachment, conditional leader release, revision and audit share the entry mutation transaction.
-- FAILURE_BEHAVIOR: failures roll back the entry deletion and all team changes.
-- SEARCH_PATH: pinned to pg_catalog, public.
-- GRANTS: CREATE OR REPLACE preserves the existing function ACL; no grant or permission changes.

create or replace function public.detach_deleted_action_attendance_team_member()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_team_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_actor_id text := coalesce(nullif(btrim(new.updated_by), ''), 'system:attendance-entry-deleted');
begin
  if old.deleted_at is null and new.deleted_at is not null then
    select m.team_id into v_team_id from public.action_attendance_team_members m
    where m.action_id = new.action_id and m.entry_id = new.id;
    if v_team_id is not null then
      v_before := public.action_attendance_team_snapshot(new.action_id, array[v_team_id]);
      delete from public.action_attendance_team_members where action_id = new.action_id and entry_id = new.id;
      update public.action_attendance_teams set
        leader_entry_id = case when leader_entry_id = new.id then null else leader_entry_id end,
        revision = revision + 1,
        updated_by = v_actor_id,
        updated_at = now()
      where action_id = new.action_id and id = v_team_id;
      v_after := public.action_attendance_team_snapshot(new.action_id, array[v_team_id]);
      insert into public.action_attendance_team_audit(action_id, team_id, actor_id, request_id, operation, before_value, after_value)
      values (new.action_id, v_team_id, v_actor_id, gen_random_uuid(), 'member_removed_with_entry', v_before, v_after);
    end if;
  end if;
  return new;
end;
$$;
