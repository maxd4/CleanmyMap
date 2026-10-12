-- SPOGOMI: make every composition mutation use the same protected transaction.
-- Forward-only migration. The day-of absence/replacement procedure remains a
-- separate, versioned and audited capability; teams/move is not that bypass.

create table if not exists public.spogomi_team_composition_mutation_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  revision bigint not null,
  action text not null check (action in ('manual_move', 'composition_lock')),
  actor_clerk_id text not null,
  participant_id uuid,
  previous_team_id uuid,
  team_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (participant_id, event_id)
    references public.spogomi_participants(id, event_id) on delete restrict,
  foreign key (previous_team_id, event_id)
    references public.spogomi_teams(id, event_id) on delete restrict,
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id) on delete restrict,
  unique (event_id, revision)
);

create index if not exists spogomi_team_composition_mutation_audit_event_idx
  on public.spogomi_team_composition_mutation_audit(event_id, created_at desc);

create or replace function public.spogomi_team_requires_composition_correction(
  p_event_id uuid,
  p_team_id uuid
)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.spogomi_teams team
     where team.id = p_team_id
       and team.event_id = p_event_id
       and (
         team.composition_state in ('locked', 'verified')
         or team.certified_submission_id is not null
         or exists (
           select 1
             from public.spogomi_team_access_grants access_grant
            where access_grant.event_id = p_event_id
              and access_grant.team_id = team.id
         )
         or exists (
           select 1
             from public.spogomi_result_submissions submission
            where submission.event_id = p_event_id
              and submission.team_id = team.id
         )
         or exists (
           select 1
             from public.spogomi_team_composition_history history
            where history.event_id = p_event_id
              and exists (
                select 1
                  from jsonb_array_elements(history.assignments) item
                 where (item ->> 'teamNumber')::integer = team.team_number
              )
         )
       )
  );
$$;

create or replace function public.guard_spogomi_participant_team_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_state text;
  v_context text := current_setting('spogomi.composition_write_context', true);
begin
  if old.team_id is not distinct from new.team_id then
    return new;
  end if;
  if coalesce(v_context, '') not in ('composition_confirm', 'composition_manual_move') then
    raise exception using
      errcode = '42501',
      message = 'Direct SPOGOMI team changes require the protected composition procedure';
  end if;
  select state into v_event_state
    from public.spogomi_events
   where id = new.event_id;
  if v_event_state not in ('draft', 'registration_open') then
    raise exception using
      errcode = 'check_violation',
      message = 'SPOGOMI composition changes require a versioned correction procedure after preparation';
  end if;
  if public.spogomi_team_requires_composition_correction(new.event_id, old.team_id)
     or public.spogomi_team_requires_composition_correction(new.event_id, new.team_id) then
    raise exception using
      errcode = 'check_violation',
      message = 'This SPOGOMI team requires an explicit audited correction procedure';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_participant_team_change_guard on public.spogomi_participants;
create trigger spogomi_participant_team_change_guard
before update of team_id on public.spogomi_participants
for each row execute function public.guard_spogomi_participant_team_change();

create or replace function public.guard_spogomi_team_composition_state_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.composition_state is not distinct from new.composition_state then
    return new;
  end if;
  if coalesce(current_setting('spogomi.composition_write_context', true), '') <> 'composition_lock'
     or old.composition_state <> 'draft'
     or new.composition_state <> 'locked' then
    raise exception using
      errcode = '42501',
      message = 'Direct SPOGOMI team lock changes require the atomic composition lock procedure';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_team_composition_state_guard on public.spogomi_teams;
create trigger spogomi_team_composition_state_guard
before update of composition_state on public.spogomi_teams
for each row execute function public.guard_spogomi_team_composition_state_change();

create or replace function public.guard_spogomi_event_composition_lock()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.state is not distinct from new.state or new.state <> 'composition_locked' then
    return new;
  end if;
  if coalesce(current_setting('spogomi.composition_write_context', true), '') <> 'composition_lock'
     or exists (
       select 1 from public.spogomi_teams
        where event_id = new.id and composition_state <> 'locked'
     ) then
    raise exception using
      errcode = '42501',
      message = 'SPOGOMI event locking requires the atomic composition lock procedure';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_event_composition_lock_guard on public.spogomi_events;
create trigger spogomi_event_composition_lock_guard
before update of state on public.spogomi_events
for each row execute function public.guard_spogomi_event_composition_lock();

create or replace function public.spogomi_move_participant_to_team(
  p_event_id uuid,
  p_participant_id uuid,
  p_team_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_participant public.spogomi_participants%rowtype;
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI team moves require the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using
      errcode = 'check_violation',
      message = 'SPOGOMI composition changes require a versioned correction procedure after preparation';
  end if;

  select * into v_participant
    from public.spogomi_participants
   where id = p_participant_id
     and event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI participant not found';
  end if;
  if v_participant.registration_status <> 'registered' then
    raise exception using errcode = 'check_violation', message = 'Only a registered SPOGOMI place can be moved';
  end if;
  if p_team_id is not null and not exists (
    select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id
  ) then
    raise exception using errcode = 'check_violation', message = 'The target SPOGOMI team does not belong to this event';
  end if;
  if v_participant.team_id is not distinct from p_team_id then
    return jsonb_build_object('already_processed', true, 'participantId', p_participant_id, 'teamId', p_team_id, 'compositionRevision', v_event.composition_revision);
  end if;
  if public.spogomi_team_requires_composition_correction(p_event_id, v_participant.team_id)
     or public.spogomi_team_requires_composition_correction(p_event_id, p_team_id) then
    raise exception using
      errcode = 'check_violation',
      message = 'This SPOGOMI team requires an explicit audited correction procedure';
  end if;

  perform set_config('spogomi.composition_write_context', 'composition_manual_move', true);
  update public.spogomi_participants
     set team_id = p_team_id, updated_at = now()
   where id = p_participant_id
     and event_id = p_event_id;

  select composition_revision into v_revision
    from public.spogomi_events
   where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(
    event_id, revision, action, actor_clerk_id, participant_id,
    previous_team_id, team_id, details
  ) values (
    p_event_id, v_revision, 'manual_move', p_actor_clerk_id, p_participant_id,
    v_participant.team_id, p_team_id,
    jsonb_build_object('source', 'organizer_preparation')
  );
  return jsonb_build_object('already_processed', false, 'participantId', p_participant_id, 'teamId', p_team_id, 'compositionRevision', v_revision);
end;
$$;

create or replace function public.spogomi_lock_team_composition(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_team_count integer;
  v_participant_count integer;
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition locking requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  select count(*) into v_team_count from public.spogomi_teams where event_id = p_event_id;
  if v_event.state = 'composition_locked' then
    if exists (select 1 from public.spogomi_teams where event_id = p_event_id and composition_state <> 'locked') then
      raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event and team lock state are inconsistent';
    end if;
    return jsonb_build_object('already_processed', true, 'locked', true, 'teamCount', v_team_count, 'compositionRevision', v_event.composition_revision);
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using
      errcode = 'check_violation',
      message = 'SPOGOMI composition locking is only available during preparation';
  end if;
  if v_team_count = 0 then
    raise exception using errcode = 'check_violation', message = 'At least one SPOGOMI team is required';
  end if;
  if exists (select 1 from public.spogomi_teams where event_id = p_event_id and composition_state <> 'draft') then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI team lock state is inconsistent';
  end if;
  select count(*) into v_participant_count
    from public.spogomi_participants
   where event_id = p_event_id
     and registration_status = 'registered';
  if exists (
    select 1
      from public.spogomi_participants
     where event_id = p_event_id
       and registration_status = 'registered'
       and team_id is null
  ) then
    raise exception using errcode = 'check_violation', message = 'Every registered SPOGOMI place must be assigned before locking';
  end if;
  if v_event.mode = 'world_cup' and exists (
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
  if v_event.mode = 'casual' and exists (
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
     where (nullif(v_event.team_size_config -> 'casual' ->> 'minMembers', '') is not null
            and member_count < (v_event.team_size_config -> 'casual' ->> 'minMembers')::integer)
        or (nullif(v_event.team_size_config -> 'casual' ->> 'maxMembers', '') is not null
            and member_count > (v_event.team_size_config -> 'casual' ->> 'maxMembers')::integer)
  ) then
    raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
  end if;

  perform set_config('spogomi.composition_write_context', 'composition_lock', true);
  update public.spogomi_teams
     set composition_state = 'locked', updated_at = now()
   where event_id = p_event_id;
  update public.spogomi_events
     set state = 'composition_locked', updated_at = now()
   where id = p_event_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(
    event_id, revision, action, actor_clerk_id, details
  ) values (
    p_event_id, v_revision, 'composition_lock', p_actor_clerk_id,
    jsonb_build_object('teamCount', v_team_count, 'registeredParticipantCount', v_participant_count)
  );
  return jsonb_build_object('already_processed', false, 'locked', true, 'teamCount', v_team_count, 'compositionRevision', v_revision);
end;
$$;

create or replace function public.spogomi_confirm_team_composition(
  p_event_id uuid,
  p_expected_revision bigint,
  p_assignments jsonb,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_assignment_count integer;
  v_registered_count integer;
  v_min_members integer;
  v_max_members integer;
  v_changed_count integer;
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition confirmation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Team assignments must be a JSON array';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since preview';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition confirmation is only available during preparation';
  end if;
  if exists (
    select 1
      from public.spogomi_teams team
     where team.event_id = p_event_id
       and public.spogomi_team_requires_composition_correction(p_event_id, team.id)
  ) then
    raise exception using errcode = 'serialization_failure', message = 'A SPOGOMI team requires an explicit audited correction procedure';
  end if;

  select count(*) into v_assignment_count from jsonb_array_elements(p_assignments) item;
  select count(*) into v_registered_count
    from public.spogomi_participants
   where event_id = p_event_id and registration_status = 'registered';
  if v_assignment_count <> v_registered_count then
    raise exception using errcode = 'check_violation', message = 'Every registered ticket must appear exactly once in the proposal';
  end if;
  if exists (
    select 1 from (
      select nullif(item ->> 'participantId', '')::uuid as participant_id
        from jsonb_array_elements(p_assignments) item
    ) assignments
    group by participant_id
    having count(*) <> 1 or participant_id is null
  ) then
    raise exception using errcode = 'check_violation', message = 'A team proposal contains duplicate or invalid participants';
  end if;
  if exists (
    select 1
      from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.registration_status = 'registered'
       and not exists (
         select 1 from jsonb_array_elements(p_assignments) item
          where (item ->> 'participantId')::uuid = participant.id
       )
  ) then
    raise exception using errcode = 'check_violation', message = 'A registered ticket is missing from the proposal';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null
       and ((item ->> 'teamNumber')::integer < 1)
  ) then
    raise exception using errcode = 'check_violation', message = 'A proposed team number is invalid';
  end if;

  if v_event.mode = 'world_cup' and exists (
    select item ->> 'teamNumber'
      from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null
     group by item ->> 'teamNumber'
    having count(*) <> 3
  ) then
    raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members';
  end if;
  if v_event.mode = 'casual' then
    v_min_members := nullif(v_event.team_size_config -> 'casual' ->> 'minMembers', '')::integer;
    v_max_members := nullif(v_event.team_size_config -> 'casual' ->> 'maxMembers', '')::integer;
    if exists (
      select 1 from (
        select (item ->> 'teamNumber')::integer as team_number, count(*) as member_count
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
         group by (item ->> 'teamNumber')::integer
      ) team_sizes
      where (v_min_members is not null and member_count < v_min_members)
         or (v_max_members is not null and member_count > v_max_members)
    ) then
      raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
    end if;
  end if;

  perform set_config('spogomi.composition_write_context', 'composition_confirm', true);
  insert into public.spogomi_teams(event_id, team_number, public_name, composition_state)
  select p_event_id, team_number, 'Équipe ' || team_number::text, 'draft'
    from (
      select distinct (item ->> 'teamNumber')::integer as team_number
        from jsonb_array_elements(p_assignments) item
       where item ->> 'teamNumber' is not null
    ) proposed
  on conflict (event_id, team_number) do nothing;

  with assignments as (
    select nullif(item ->> 'participantId', '')::uuid as participant_id,
           nullif(item ->> 'teamNumber', '')::integer as team_number
      from jsonb_array_elements(p_assignments) item
  )
  update public.spogomi_participants participant
     set team_id = team.id, updated_at = now()
    from assignments
    left join public.spogomi_teams team
      on team.event_id = p_event_id and team.team_number = assignments.team_number
   where participant.id = assignments.participant_id
     and participant.event_id = p_event_id
     and participant.team_id is distinct from team.id;
  get diagnostics v_changed_count = row_count;

  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  if v_changed_count = 0 then
    return jsonb_build_object('already_processed', true, 'compositionRevision', v_revision);
  end if;
  insert into public.spogomi_team_composition_history(event_id, revision, actor_clerk_id, assignments)
  values (p_event_id, v_revision, p_actor_clerk_id, p_assignments)
  on conflict (event_id, revision) do nothing;
  return jsonb_build_object('already_processed', false, 'compositionRevision', v_revision, 'changedParticipants', v_changed_count);
end;
$$;

alter table public.spogomi_team_composition_mutation_audit enable row level security;
revoke all on table public.spogomi_team_composition_mutation_audit from public, anon, authenticated;
grant all on table public.spogomi_team_composition_mutation_audit to service_role;

revoke all on function public.spogomi_team_requires_composition_correction(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_team_requires_composition_correction(uuid, uuid) to service_role;
revoke all on function public.spogomi_move_participant_to_team(uuid, uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_move_participant_to_team(uuid, uuid, uuid, bigint, text) to service_role;
revoke all on function public.spogomi_lock_team_composition(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_lock_team_composition(uuid, bigint, text) to service_role;

comment on table public.spogomi_team_composition_mutation_audit is
  'Append-only audit for ordinary composition moves and atomic locks; day-of replacements require a distinct versioned correction procedure.';
