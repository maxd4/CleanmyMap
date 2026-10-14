-- SPOGOMI division composition correction: PostgreSQL has no min(uuid).
-- Keep the correction append-only and preserve the public RPC signature.

create or replace function public.spogomi_confirm_team_composition_v2(
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
  -- GRANTS: service_role only.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition confirmation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 or jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'A valid composition actor and JSON array are required';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since preview';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition confirmation is only available during preparation';
  end if;
  perform 1 from public.spogomi_divisions where event_id = p_event_id for update;
  select count(*)::integer, (array_agg(id order by id))[1]
    into v_division_count, v_default_division_id
    from public.spogomi_divisions where event_id = p_event_id;
  if v_division_count <> (case when v_event.mode = 'mixed' then 2 else 1 end) then
    raise exception using errcode = 'check_violation', message = 'The SPOGOMI edition has an invalid division set';
  end if;
  if v_event.mode = 'mixed' and exists (select 1 from jsonb_array_elements(p_assignments) item where nullif(item ->> 'divisionId', '') is null) then
    raise exception using errcode = 'check_violation', message = 'A mixed SPOGOMI proposal requires an explicit divisionId for every participant';
  end if;
  select count(*) into v_assignment_count from jsonb_array_elements(p_assignments);
  select count(*) into v_registered_count from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered';
  if v_assignment_count <> v_registered_count then
    raise exception using errcode = 'check_violation', message = 'Every registered ticket must appear exactly once in the proposal';
  end if;
  if exists (
    select 1 from (select nullif(item ->> 'participantId', '')::uuid as participant_id from jsonb_array_elements(p_assignments) item) assignments
    group by participant_id having count(*) <> 1 or participant_id is null
  ) then raise exception using errcode = 'check_violation', message = 'A team proposal contains duplicate or invalid participants'; end if;
  if exists (
    select 1 from public.spogomi_participants participant
     where participant.event_id = p_event_id and participant.registration_status = 'registered'
       and not exists (select 1 from jsonb_array_elements(p_assignments) item where (item ->> 'participantId')::uuid = participant.id)
  ) then raise exception using errcode = 'check_violation', message = 'A registered ticket is missing from the proposal'; end if;
  if exists (
    select 1
      from jsonb_array_elements(p_assignments) item
      left join public.spogomi_participants participant on participant.id = (item ->> 'participantId')::uuid and participant.event_id = p_event_id
      left join public.spogomi_divisions division on division.id = coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) and division.event_id = p_event_id
     where participant.id is null or division.id is null or participant.division_id <> division.id
  ) then raise exception using errcode = 'check_violation', message = 'Every participant must be assigned to its explicit SPOGOMI division'; end if;
  if exists (select 1 from jsonb_array_elements(p_assignments) item where item ->> 'teamNumber' is not null and ((item ->> 'teamNumber')::integer < 1)) then
    raise exception using errcode = 'check_violation', message = 'A proposed team number is invalid';
  end if;
  if exists (
    select 1 from (
      select coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) division_id, (item ->> 'teamNumber')::integer team_number, count(*) member_count
        from jsonb_array_elements(p_assignments) item where item ->> 'teamNumber' is not null
       group by coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id), (item ->> 'teamNumber')::integer
    ) sizes join public.spogomi_divisions division on division.id = sizes.division_id
    where division.division_type = 'world_cup' and sizes.member_count <> 3
  ) then raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members'; end if;
  if exists (
    select 1 from (
      select coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) division_id, (item ->> 'teamNumber')::integer team_number, count(*) member_count
        from jsonb_array_elements(p_assignments) item where item ->> 'teamNumber' is not null
       group by coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id), (item ->> 'teamNumber')::integer
    ) sizes join public.spogomi_divisions division on division.id = sizes.division_id
    where division.division_type = 'casual'
      and ((v_event.team_size_config -> 'casual' ->> 'minMembers') is not null and sizes.member_count < (v_event.team_size_config -> 'casual' ->> 'minMembers')::integer
        or (v_event.team_size_config -> 'casual' ->> 'maxMembers') is not null and sizes.member_count > (v_event.team_size_config -> 'casual' ->> 'maxMembers')::integer)
  ) then raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds'; end if;
  if exists (
    select 1 from public.spogomi_teams team
     where team.event_id = p_event_id and public.spogomi_team_requires_composition_correction(p_event_id, team.id)
  ) then raise exception using errcode = 'serialization_failure', message = 'A SPOGOMI team requires an explicit audited correction procedure'; end if;

  perform set_config('spogomi.composition_write_context', 'composition_confirm', true);
  insert into public.spogomi_teams(event_id, division_id, team_number, public_name, composition_state)
  select p_event_id, proposal.division_id, proposal.team_number, 'Équipe ' || proposal.team_number::text, 'draft'
    from (select distinct coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) division_id, (item ->> 'teamNumber')::integer team_number
            from jsonb_array_elements(p_assignments) item where item ->> 'teamNumber' is not null) proposal
  on conflict (event_id, division_id, team_number) do nothing;
  with assignments as (
    select nullif(item ->> 'participantId', '')::uuid participant_id, coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) division_id, nullif(item ->> 'teamNumber', '')::integer team_number
      from jsonb_array_elements(p_assignments) item
  )
  update public.spogomi_participants participant set team_id = team.id, division_id = assignments.division_id, updated_at = now()
    from assignments left join public.spogomi_teams team on team.event_id = p_event_id and team.division_id = assignments.division_id and team.team_number = assignments.team_number
   where participant.id = assignments.participant_id and participant.event_id = p_event_id and participant.team_id is distinct from team.id;
  get diagnostics v_changed_count = row_count;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  if v_changed_count = 0 then return jsonb_build_object('already_processed', true, 'compositionRevision', v_revision); end if;
  insert into public.spogomi_team_composition_history(event_id, division_id, revision, actor_clerk_id, assignments)
  select p_event_id, assignments.division_id, v_revision, p_actor_clerk_id,
         jsonb_agg(jsonb_build_object('participantId', assignments.participant_id, 'divisionId', assignments.division_id, 'teamNumber', assignments.team_number) order by assignments.participant_id)
    from (select nullif(item ->> 'participantId', '')::uuid participant_id, coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id) division_id, nullif(item ->> 'teamNumber', '')::integer team_number from jsonb_array_elements(p_assignments) item) assignments
   group by assignments.division_id
  on conflict (event_id, division_id, revision) do nothing;
  return jsonb_build_object('already_processed', false, 'compositionRevision', v_revision, 'changedParticipants', v_changed_count);
end;
$$;

create or replace function public.spogomi_confirm_team_composition(
  p_event_id uuid, p_expected_revision bigint, p_assignments jsonb, p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  return public.spogomi_confirm_team_composition_v2(p_event_id, p_expected_revision, p_assignments, p_actor_clerk_id);
end;
$$;

revoke all on function public.spogomi_confirm_team_composition_v2(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition_v2(uuid, bigint, jsonb, text) to service_role;
revoke all on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) to service_role;
