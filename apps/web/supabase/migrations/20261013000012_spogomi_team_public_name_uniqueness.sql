-- SPOGOMI lot 11C corrective migration: enforce public-name uniqueness at the database boundary.
-- Forward-only. Existing normalized collisions abort this migration and require explicit organizer resolution.

do $$
begin
  if exists (
    select 1
      from public.spogomi_teams
     group by event_id, public.spogomi_team_public_name_key(public_name)
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'unique_violation',
      message = 'Cannot add SPOGOMI team public-name uniqueness: existing normalized collisions require explicit resolution';
  end if;
end;
$$;

create unique index spogomi_teams_event_public_name_key_unique
  on public.spogomi_teams(event_id, public.spogomi_team_public_name_key(public_name));

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
  -- PURPOSE: confirm one complete team proposal without creating duplicate public pseudonyms.
  -- CALLER: server-only composition confirmation after organizer authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; RLS remains enabled on private tables.
  -- IDEMPOTENCY: replay with the same participant assignments remains already_processed.
  -- ATOMICITY: event lock, collision check, team creation, participant updates and history share this transaction.
  -- FAILURE_BEHAVIOR: a generated public-name collision aborts before any team or participant mutation.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role below.
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

  if exists (
    select 1
      from (
        select distinct (item ->> 'teamNumber')::integer as team_number
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
      ) proposed
     where not exists (
       select 1
         from public.spogomi_teams same_number
        where same_number.event_id = p_event_id
          and same_number.team_number = proposed.team_number
     )
       and exists (
         select 1
           from public.spogomi_teams existing
          where existing.event_id = p_event_id
            and public.spogomi_team_public_name_key(existing.public_name) = public.spogomi_team_public_name_key('Équipe ' || proposed.team_number::text)
       )
  ) then
    raise exception using
      errcode = 'unique_violation',
      message = 'A generated SPOGOMI team public name is already used in this event; resolve the collision before confirming composition';
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

revoke all on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) to service_role;

comment on index public.spogomi_teams_event_public_name_key_unique is
  'Database boundary for normalized SPOGOMI public team-name uniqueness within one event; historical collisions block migration instead of being rewritten.';
