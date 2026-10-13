-- SPOGOMI targeted correction: close participant and composition-rule writes
-- after the official composition boundary. Forward-only; no remote migration
-- is applied by this repository change.

alter table public.spogomi_roster_import_changes
  drop constraint if exists spogomi_roster_import_changes_change_kind_check;

alter table public.spogomi_roster_import_changes
  add constraint spogomi_roster_import_changes_change_kind_check
  check (change_kind in (
    'ticket_status_changed',
    'ticket_cancelled',
    'ticket_reactivated',
    'ticket_order_changed',
    'ticket_advanced_order_changed',
    'ticket_identity_changed',
    'ticket_cancellation_conflict',
    'ticket_composition_lock_conflict'
  ));

create or replace function public.guard_spogomi_participant_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_state text;
  v_context text := coalesce(current_setting('spogomi.composition_write_context', true), '');
  v_composition_protected boolean;
  v_team_changed boolean := false;
  v_eligibility_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    v_team_changed := true;
    v_eligibility_changed := true;
  else
    v_team_changed := old.team_id is distinct from new.team_id;
    v_eligibility_changed := old.registration_status is distinct from new.registration_status
      or old.ticket_status is distinct from new.ticket_status
      or old.ticket_deleted is distinct from new.ticket_deleted;
  end if;
  select state into v_event_state
    from public.spogomi_events
   where id = new.event_id;
  select v_event_state not in ('draft', 'registration_open')
      or exists (
        select 1
          from public.spogomi_teams team
         where team.event_id = new.event_id
           and public.spogomi_team_requires_composition_correction(new.event_id, team.id)
      )
    into v_composition_protected;

  if not v_composition_protected then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_context = 'ticket_reconciliation'
       and new.source_system = 'cachan_ticketing'
       and new.registration_status = 'withdrawn'
       and new.team_id is null then
      return new;
    end if;
    raise exception using
      errcode = 'check_violation',
      message = 'New SPOGOMI places after composition lock require an explicit audited arbitration procedure';
  end if;

  if not v_team_changed and not v_eligibility_changed then
    return new;
  end if;
  if v_context = 'ticket_reconciliation'
     and not v_team_changed
     and new.registration_status is not distinct from old.registration_status then
    -- Commercial columns may be refreshed for audit, but they cannot change
    -- official eligibility after lock.
    return new;
  end if;
  raise exception using
    errcode = 'check_violation',
    message = 'SPOGOMI participant eligibility or team changes require an explicit audited arbitration procedure after composition lock';
end;
$$;

drop trigger if exists spogomi_participant_lifecycle_guard on public.spogomi_participants;
create trigger spogomi_participant_lifecycle_guard
before insert or update of registration_status, ticket_status, ticket_deleted, team_id
on public.spogomi_participants
for each row execute function public.guard_spogomi_participant_lifecycle();

create or replace function public.guard_spogomi_event_composition_rules()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.mode is not distinct from new.mode
     and old.team_size_config is not distinct from new.team_size_config then
    return new;
  end if;
  if coalesce(current_setting('spogomi.composition_write_context', true), '') <> 'event_metadata_update'
     or old.state not in ('draft', 'registration_open')
     or new.state not in ('draft', 'registration_open') then
    raise exception using
      errcode = 'check_violation',
      message = 'SPOGOMI mode and team-size rules are immutable after composition lock';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_event_composition_rules_guard on public.spogomi_events;
create trigger spogomi_event_composition_rules_guard
before update of mode, team_size_config, state
on public.spogomi_events
for each row execute function public.guard_spogomi_event_composition_rules();

create or replace function public.spogomi_update_event_metadata(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_name text,
  p_location_label text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_mode text,
  p_team_size_config jsonb,
  p_public_visibility text,
  p_public_results_visibility text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_min_members integer;
  v_max_members integer;
  v_rules_changed boolean;
  v_revision bigint;
begin
  -- PURPOSE: update organizer event metadata without reopening composition rules.
  -- CALLER: server-only organizer PATCH after Clerk authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; the route owns organizer access.
  -- IDEMPOTENCY: same revision and values are a no-op apart from metadata update.
  -- ATOMICITY: event lock, rule validation and update share one transaction.
  -- FAILURE_BEHAVIOR: stale revisions and post-lock rule changes fail closed.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role below.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI event updates require the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if p_mode not in ('casual', 'world_cup') then
    raise exception using errcode = 'check_violation', message = 'Invalid SPOGOMI event mode';
  end if;
  if jsonb_typeof(p_team_size_config) <> 'object' then
    raise exception using errcode = 'check_violation', message = 'Invalid SPOGOMI team-size configuration';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event changed since the page was loaded';
  end if;

  v_rules_changed := v_event.mode is distinct from p_mode
    or v_event.team_size_config is distinct from p_team_size_config;
  if v_rules_changed and (
    v_event.state not in ('draft', 'registration_open')
    or exists (
      select 1
        from public.spogomi_teams team
       where team.event_id = p_event_id
         and public.spogomi_team_requires_composition_correction(p_event_id, team.id)
    )
  ) then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI mode and team-size rules are immutable after composition lock';
  end if;

  v_min_members := nullif(p_team_size_config #>> '{casual,minMembers}', '')::integer;
  v_max_members := nullif(p_team_size_config #>> '{casual,maxMembers}', '')::integer;
  if p_mode = 'casual'
     and ((v_min_members is not null and v_min_members < 1)
       or (v_max_members is not null and v_max_members < 1)
       or (v_min_members is not null and v_max_members is not null and v_min_members > v_max_members)) then
    raise exception using errcode = 'check_violation', message = 'Casual team-size bounds are invalid';
  end if;
  if v_rules_changed and p_mode = 'world_cup' and exists (
    select 1
      from public.spogomi_teams team
      left join public.spogomi_participants participant
        on participant.team_id = team.id
       and participant.event_id = p_event_id
       and participant.registration_status = 'registered'
     where team.event_id = p_event_id
     group by team.id
    having count(participant.id) <> 3
  ) then
    raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members';
  end if;
  if v_rules_changed and p_mode = 'casual' and exists (
    select 1
      from (
        select team.id, count(participant.id) as member_count
          from public.spogomi_teams team
          left join public.spogomi_participants participant
            on participant.team_id = team.id
           and participant.event_id = p_event_id
           and participant.registration_status = 'registered'
         where team.event_id = p_event_id
         group by team.id
      ) team_sizes
     where (v_min_members is not null and member_count < v_min_members)
        or (v_max_members is not null and member_count > v_max_members)
  ) then
    raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
  end if;

  perform set_config('spogomi.composition_write_context', 'event_metadata_update', true);
  update public.spogomi_events
     set name = p_name,
         location_label = p_location_label,
         starts_at = p_starts_at,
         ends_at = p_ends_at,
         mode = p_mode,
         team_size_config = p_team_size_config,
         public_visibility = p_public_visibility,
         public_results_visibility = p_public_results_visibility,
         composition_revision = composition_revision + case when v_rules_changed then 1 else 0 end,
         updated_at = now()
   where id = p_event_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  select * into v_event from public.spogomi_events where id = p_event_id;
  return jsonb_build_object(
    'id', v_event.id,
    'action_id', v_event.action_id,
    'created_by_clerk_id', v_event.created_by_clerk_id,
    'name', v_event.name,
    'location_label', v_event.location_label,
    'mode', v_event.mode,
    'state', v_event.state,
    'starts_at', v_event.starts_at,
    'ends_at', v_event.ends_at,
    'team_size_config', v_event.team_size_config,
    'creation_state', v_event.creation_state,
    'event_slug', v_event.event_slug,
    'public_visibility', v_event.public_visibility,
    'public_results_visibility', v_event.public_results_visibility,
    'composition_revision', v_revision
  );
end;
$$;

revoke all on function public.spogomi_update_event_metadata(uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_update_event_metadata(uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text) to service_role;
revoke all on function public.guard_spogomi_participant_lifecycle() from public, anon, authenticated;
revoke all on function public.guard_spogomi_event_composition_rules() from public, anon, authenticated;

comment on function public.spogomi_update_event_metadata(uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text) is
  'Atomic organizer metadata update. Mode and team-size rules remain immutable after composition lock and composition_revision advances when they change.';
