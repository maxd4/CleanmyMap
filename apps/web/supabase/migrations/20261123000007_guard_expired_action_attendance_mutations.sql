-- PURPOSE: prevent nominative attendance rows from being created or changed after the canonical 90-day retention deadline.
-- CALLER: row triggers on the private action attendance tables.
-- AUTHORIZATION_BOUNDARY: the trigger helper is not directly executable; existing service-role RPC grants remain unchanged.
-- IDEMPOTENCY: RPC retries that return an existing audit result perform no row write and remain valid after expiry.
-- ATOMICITY: the helper locks the action row while checking the canonical expiry; the guarded write shares that transaction.
-- FAILURE_BEHAVIOR: expired writes raise action_attendance_retention_expired and roll back the calling mutation.
-- SEARCH_PATH: pinned to pg_catalog, public.
-- GRANTS: no RPC grants change; direct execution of the trigger helper is revoked.

create or replace function public.guard_action_attendance_retention_window()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expires_at timestamptz;
begin
  perform 1
    from public.actions a
   where a.id = new.action_id
   for update;

  if not found then
    raise exception 'action_not_found' using errcode = 'P0002';
  end if;

  select public.action_attendance_data_expires_at(new.action_id)
    into v_expires_at;

  if v_expires_at is null or v_expires_at <= clock_timestamp() then
    raise exception 'action_attendance_retention_expired' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_action_attendance_retention_window() from public, anon, authenticated, service_role;

create trigger action_attendance_entries_retention_guard
before insert or update on public.action_attendance_entries
for each row execute function public.guard_action_attendance_retention_window();

create trigger action_attendance_entry_audit_retention_guard
before insert or update on public.action_attendance_entry_audit
for each row execute function public.guard_action_attendance_retention_window();

create trigger action_attendance_teams_retention_guard
before insert or update on public.action_attendance_teams
for each row execute function public.guard_action_attendance_retention_window();

create trigger action_attendance_team_members_retention_guard
before insert or update on public.action_attendance_team_members
for each row execute function public.guard_action_attendance_retention_window();

create trigger action_attendance_team_audit_retention_guard
before insert or update on public.action_attendance_team_audit
for each row execute function public.guard_action_attendance_retention_window();
