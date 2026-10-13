-- SPOGOMI lot 11C: editable public team names.
-- Forward-only. The canonical value remains spogomi_teams.public_name.

alter table public.admin_operations_audit
  drop constraint if exists admin_operations_audit_operation_type_check;

alter table public.admin_operations_audit
  add constraint admin_operations_audit_operation_type_check
  check (operation_type in ('moderation', 'import_dry_run', 'import_confirm', 'role_management', 'admin_operation', 'spogomi_team_name_rename'));

create or replace function public.spogomi_normalize_team_public_name(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select regexp_replace(btrim(normalize(coalesce(p_name, ''))), '[[:space:]]+', ' ', 'g');
$$;

create or replace function public.spogomi_team_public_name_key(p_name text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select lower(public.spogomi_normalize_team_public_name(p_name));
$$;

create or replace function public.guard_spogomi_team_public_name_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.public_name is not distinct from old.public_name then
    return new;
  end if;
  if current_setting('spogomi.team_name_write_context', true) <> 'team_name_rename' then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'SPOGOMI team public names must be changed through the audited rename procedure';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_team_public_name_write_guard on public.spogomi_teams;
create trigger spogomi_team_public_name_write_guard
before update of public_name on public.spogomi_teams
for each row execute function public.guard_spogomi_team_public_name_write();

-- A presentation-only rename must not advance the composition revision.
-- Composition changes still use the existing trigger and revision owner.
drop trigger if exists spogomi_teams_bump_composition_revision on public.spogomi_teams;
create trigger spogomi_teams_bump_composition_revision
after insert or delete or update of event_id, team_number, composition_state, certified_submission_id on public.spogomi_teams
for each row execute function public.bump_spogomi_composition_revision();

create or replace function public.spogomi_rename_team_public_name(
  p_event_id uuid,
  p_team_id uuid,
  p_expected_public_name text,
  p_public_name text,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_team public.spogomi_teams%rowtype;
  v_public_name text;
begin
  -- AUTHORIZATION_BOUNDARY: the HTTP route authenticates and authorizes the organizer;
  -- this RPC remains service_role-only and checks event/team ownership in the transaction.
  -- ATOMICITY: event lock, stale-name check, collision check, update and audit commit together.
  -- IDEMPOTENCY: the canonical same-value replay returns without a second audit row.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI team renames require the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A rename actor is required';
  end if;
  if p_expected_public_name is null then
    raise exception using errcode = 'check_violation', message = 'The expected team public name is required';
  end if;
  if p_public_name is null or btrim(p_public_name) = '' then
    raise exception using errcode = 'check_violation', message = 'The team public name is required';
  end if;
  if p_public_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'check_violation', message = 'The team public name cannot contain control characters';
  end if;

  v_public_name := public.spogomi_normalize_team_public_name(p_public_name);
  if length(v_public_name) = 0 or char_length(v_public_name) > 60 then
    raise exception using errcode = 'check_violation', message = 'The team public name must contain between 1 and 60 characters';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;

  select * into v_team
    from public.spogomi_teams
   where id = p_team_id
     and event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI team not found for this event';
  end if;

  if public.spogomi_normalize_team_public_name(v_team.public_name) is distinct from public.spogomi_normalize_team_public_name(p_expected_public_name)
     and public.spogomi_normalize_team_public_name(v_team.public_name) is distinct from v_public_name then
    raise exception using errcode = 'serialization_failure', message = 'The team public name changed since the page was loaded';
  end if;

  if public.spogomi_normalize_team_public_name(v_team.public_name) is not distinct from v_public_name then
    return jsonb_build_object(
      'already_processed', true,
      'id', v_team.id,
      'event_id', v_team.event_id,
      'team_number', v_team.team_number,
      'public_name', v_team.public_name,
      'composition_state', v_team.composition_state,
      'certified_submission_id', v_team.certified_submission_id
    );
  end if;

  if exists (
    select 1
      from public.spogomi_teams other_team
     where other_team.event_id = p_event_id
       and other_team.id <> p_team_id
       and public.spogomi_team_public_name_key(other_team.public_name) = public.spogomi_team_public_name_key(v_public_name)
  ) then
    raise exception using errcode = 'unique_violation', message = 'This team public name is already used in this event';
  end if;

  perform set_config('spogomi.team_name_write_context', 'team_name_rename', true);
  update public.spogomi_teams
     set public_name = v_public_name
   where id = p_team_id
     and event_id = p_event_id;

  insert into public.admin_operations_audit(
    operation_id, at, actor_user_id, operation_type, outcome, target_id, details
  ) values (
    gen_random_uuid()::text,
    now(),
    p_actor_clerk_id,
    'spogomi_team_name_rename',
    'success',
    p_team_id::text,
    jsonb_build_object(
      'eventId', p_event_id,
      'teamId', p_team_id,
      'teamNumber', v_team.team_number,
      'previousPublicName', v_team.public_name,
      'publicName', v_public_name
    )
  );

  select * into v_team from public.spogomi_teams where id = p_team_id and event_id = p_event_id;
  return jsonb_build_object(
    'already_processed', false,
    'id', v_team.id,
    'event_id', v_team.event_id,
    'team_number', v_team.team_number,
    'public_name', v_team.public_name,
    'composition_state', v_team.composition_state,
    'certified_submission_id', v_team.certified_submission_id
  );
end;
$$;

revoke all on function public.spogomi_normalize_team_public_name(text) from public, anon, authenticated;
grant execute on function public.spogomi_normalize_team_public_name(text) to service_role;
revoke all on function public.spogomi_team_public_name_key(text) from public, anon, authenticated;
grant execute on function public.spogomi_team_public_name_key(text) to service_role;
revoke all on function public.guard_spogomi_team_public_name_write() from public, anon, authenticated;
revoke all on function public.spogomi_rename_team_public_name(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_rename_team_public_name(uuid, uuid, text, text, text) to service_role;

comment on function public.spogomi_rename_team_public_name(uuid, uuid, text, text, text) is
  'Atomic, organizer-authorized and audited public team-name rename. It never changes team membership, results or composition_revision.';
