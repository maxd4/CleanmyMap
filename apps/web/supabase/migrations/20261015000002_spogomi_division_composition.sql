-- SPOGOMI division composition correction.
-- The previous migration intentionally removed the parent-wide team-number
-- uniqueness. This forward-only correction updates the server procedures that
-- still referenced that legacy key.

alter table public.spogomi_team_composition_history
  drop constraint if exists spogomi_team_composition_history_event_id_revision_key;

create unique index spogomi_team_composition_history_event_division_revision_unique
  on public.spogomi_team_composition_history(event_id, division_id, revision);

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
  v_default_division_id uuid;
  v_division_count integer;
  v_assignment_count integer;
  v_registered_count integer;
  v_min_members integer;
  v_max_members integer;
  v_changed_count integer;
  v_revision bigint;
begin
  -- PURPOSE: atomically confirm explicit team proposals inside typed divisions.
  -- CALLER: server-only composition confirmation after organizer authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; HTTP AuthN/AuthZ remains outside SQL.
  -- IDEMPOTENCY: replayed participant/division assignments return already_processed.
  -- ATOMICITY: parent/division locks, team writes, participant moves and history share one transaction.
  -- FAILURE_BEHAVIOR: missing division context, stale revision, cross-division references and invalid sizes abort.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only, preserved below.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition confirmation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Team assignments must be a JSON array';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since preview';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition confirmation is only available during preparation';
  end if;
  perform 1 from public.spogomi_divisions where event_id = p_event_id for update;
  select count(*)::integer, min(id) into v_division_count, v_default_division_id
    from public.spogomi_divisions where event_id = p_event_id;
  if v_event.mode = 'mixed' and exists (
    select 1 from jsonb_array_elements(p_assignments) item
    where nullif(item ->> 'divisionId', '') is null
  ) then
    raise exception using errcode = 'check_violation', message = 'A mixed SPOGOMI proposal requires an explicit divisionId for every participant';
  end if;
  if v_division_count <> (case when v_event.mode = 'mixed' then 2 else 1 end) then
    raise exception using errcode = 'check_violation', message = 'The SPOGOMI edition has an invalid division set';
  end if;

  select count(*) into v_assignment_count from jsonb_array_elements(p_assignments);
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
    select 1
      from jsonb_array_elements(p_assignments) item
      left join public.spogomi_participants participant on participant.id = (item ->> 'participantId')::uuid and participant.event_id = p_event_id
      left join public.spogomi_divisions division on division.id = coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) and division.event_id = p_event_id
     where participant.id is null or division.id is null or participant.division_id <> division.id
  ) then
    raise exception using errcode = 'check_violation', message = 'Every participant must be assigned to its explicit SPOGOMI division';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null and ((item ->> 'teamNumber')::integer < 1)
  ) then
    raise exception using errcode = 'check_violation', message = 'A proposed team number is invalid';
  end if;
  if exists (
    select 1
      from (
        select coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
               (item ->> 'teamNumber')::integer as team_number,
               count(*) as member_count
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
         group by coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id), (item ->> 'teamNumber')::integer
      ) team_sizes
      join public.spogomi_divisions division on division.id = team_sizes.division_id
     where division.division_type = 'world_cup' and team_sizes.member_count <> 3
  ) then
    raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members';
  end if;
  if exists (
    select 1
      from (
        select coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
               (item ->> 'teamNumber')::integer as team_number,
               count(*) as member_count
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
         group by coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id), (item ->> 'teamNumber')::integer
      ) team_sizes
      join public.spogomi_divisions division on division.id = team_sizes.division_id
     where division.division_type = 'casual'
       and (
         (nullif(v_event.team_size_config -> 'casual' ->> 'minMembers', '') is not null and team_sizes.member_count < (v_event.team_size_config -> 'casual' ->> 'minMembers')::integer)
         or (nullif(v_event.team_size_config -> 'casual' ->> 'maxMembers', '') is not null and team_sizes.member_count > (v_event.team_size_config -> 'casual' ->> 'maxMembers')::integer)
       )
  ) then
    raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
  end if;
  if exists (
    select 1
      from (
        select distinct coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
                        (item ->> 'teamNumber')::integer as team_number
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
      ) proposed
     where not exists (select 1 from public.spogomi_teams team where team.event_id = p_event_id and team.division_id = proposed.division_id and team.team_number = proposed.team_number)
       and exists (
         select 1 from public.spogomi_teams existing
          where existing.event_id = p_event_id and existing.division_id = proposed.division_id
            and public.spogomi_team_public_name_key(existing.public_name) = public.spogomi_team_public_name_key('Équipe ' || proposed.team_number::text)
       )
  ) then
    raise exception using errcode = 'unique_violation', message = 'A generated SPOGOMI team public name is already used in this division';
  end if;

  perform set_config('spogomi.composition_write_context', 'composition_confirm', true);
  insert into public.spogomi_teams(event_id, division_id, team_number, public_name, composition_state)
  select p_event_id, proposed.division_id, proposed.team_number, 'Équipe ' || proposed.team_number::text, 'draft'
    from (
      select distinct coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
                      (item ->> 'teamNumber')::integer as team_number
        from jsonb_array_elements(p_assignments) item
       where item ->> 'teamNumber' is not null
    ) proposed
  on conflict (event_id, division_id, team_number) do nothing;

  with assignments as (
    select nullif(item ->> 'participantId', '')::uuid as participant_id,
           coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
           nullif(item ->> 'teamNumber', '')::integer as team_number
      from jsonb_array_elements(p_assignments) item
  )
  update public.spogomi_participants participant
     set team_id = team.id, division_id = assignments.division_id, updated_at = now()
    from assignments
    left join public.spogomi_teams team
      on team.event_id = p_event_id and team.division_id = assignments.division_id and team.team_number = assignments.team_number
   where participant.id = assignments.participant_id
     and participant.event_id = p_event_id
     and participant.team_id is distinct from team.id;
  get diagnostics v_changed_count = row_count;

  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  if v_changed_count = 0 then
    return jsonb_build_object('already_processed', true, 'compositionRevision', v_revision);
  end if;
  insert into public.spogomi_team_composition_history(event_id, division_id, revision, actor_clerk_id, assignments)
  select p_event_id, assignment.division_id, v_revision, p_actor_clerk_id,
         jsonb_agg(jsonb_build_object('participantId', assignment.participant_id, 'divisionId', assignment.division_id, 'teamNumber', assignment.team_number) order by assignment.participant_id)
    from (
      select nullif(item ->> 'participantId', '')::uuid as participant_id,
             coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) as division_id,
             nullif(item ->> 'teamNumber', '')::integer as team_number
        from jsonb_array_elements(p_assignments) item
    ) assignment
   group by assignment.division_id
  on conflict (event_id, division_id, revision) do nothing;
  return jsonb_build_object('already_processed', false, 'compositionRevision', v_revision, 'changedParticipants', v_changed_count);
end;
$$;

revoke all on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) to service_role;

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
  v_team public.spogomi_teams%rowtype;
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI team moves require the server role';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found or v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition changes require preparation state';
  end if;
  select * into v_participant from public.spogomi_participants where id = p_participant_id and event_id = p_event_id for update;
  if not found or v_participant.registration_status <> 'registered' then
    raise exception using errcode = 'no_data_found', message = 'Registered SPOGOMI participant not found';
  end if;
  if p_team_id is not null then
    select * into v_team from public.spogomi_teams where id = p_team_id and event_id = p_event_id for update;
    if not found or v_team.division_id <> v_participant.division_id then
      raise exception using errcode = 'check_violation', message = 'The target team must belong to the participant division';
    end if;
  end if;
  if v_participant.team_id is not distinct from p_team_id then
    return jsonb_build_object('already_processed', true, 'participantId', p_participant_id, 'teamId', p_team_id, 'divisionId', v_participant.division_id, 'compositionRevision', v_event.composition_revision);
  end if;
  perform set_config('spogomi.composition_write_context', 'composition_manual_move', true);
  update public.spogomi_participants set team_id = p_team_id, updated_at = now() where id = p_participant_id and event_id = p_event_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, participant_id, previous_team_id, team_id, details)
  values (p_event_id, v_participant.division_id, v_revision, 'manual_move', p_actor_clerk_id, p_participant_id, v_participant.team_id, p_team_id, jsonb_build_object('source', 'organizer_preparation'));
  return jsonb_build_object('already_processed', false, 'participantId', p_participant_id, 'teamId', p_team_id, 'divisionId', v_participant.division_id, 'compositionRevision', v_revision);
end;
$$;

revoke all on function public.spogomi_move_participant_to_team(uuid, uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_move_participant_to_team(uuid, uuid, uuid, bigint, text) to service_role;
