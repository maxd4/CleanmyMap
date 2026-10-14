-- SPOGOMI division lock correction: validate and audit each division while
-- preserving the existing parent-level optimistic revision and lock boundary.

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
  -- PURPOSE: atomically lock every prepared team with per-division size checks.
  -- CALLER: server-only organizer preparation route.
  -- AUTHORIZATION_BOUNDARY: service_role only; the route remains responsible for Clerk AuthZ.
  -- IDEMPOTENCY: a locked parent with locked teams returns already_processed.
  -- ATOMICITY: parent/division locks, team state, parent state and audit rows commit together.
  -- FAILURE_BEHAVIOR: stale revisions, incomplete assignments and invalid division sizes abort.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition locking requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  perform 1 from public.spogomi_divisions where event_id = p_event_id for update;
  select count(*) into v_team_count from public.spogomi_teams where event_id = p_event_id;
  if v_event.state = 'composition_locked' then
    if exists (select 1 from public.spogomi_teams where event_id = p_event_id and composition_state <> 'locked') then
      raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event and team lock state are inconsistent';
    end if;
    return jsonb_build_object('already_processed', true, 'locked', true, 'teamCount', v_team_count, 'compositionRevision', v_event.composition_revision);
  end if;
  if v_event.state not in ('draft', 'registration_open') or v_team_count = 0 then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition locking requires prepared teams';
  end if;
  if exists (select 1 from public.spogomi_teams where event_id = p_event_id and composition_state <> 'draft') then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI team lock state is inconsistent';
  end if;
  select count(*) into v_participant_count from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered';
  if exists (select 1 from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered' and team_id is null) then
    raise exception using errcode = 'check_violation', message = 'Every registered SPOGOMI place must be assigned before locking';
  end if;
  if exists (
    select 1 from public.spogomi_teams team
    join public.spogomi_divisions division on division.id = team.division_id and division.event_id = team.event_id
    left join public.spogomi_participants participant on participant.team_id = team.id and participant.event_id = p_event_id and participant.division_id = team.division_id and participant.registration_status = 'registered'
    where team.event_id = p_event_id and division.division_type = 'world_cup'
    group by team.id having count(participant.id) <> 3
  ) then raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members'; end if;
  if exists (
    select 1 from (
      select team.id, division.division_type, count(participant.id) member_count
        from public.spogomi_teams team
        join public.spogomi_divisions division on division.id = team.division_id and division.event_id = team.event_id
        left join public.spogomi_participants participant on participant.team_id = team.id and participant.event_id = p_event_id and participant.division_id = team.division_id and participant.registration_status = 'registered'
       where team.event_id = p_event_id and division.division_type = 'casual'
       group by team.id, division.division_type
    ) sizes
    where (v_event.team_size_config -> 'casual' ->> 'minMembers') is not null and sizes.member_count < (v_event.team_size_config -> 'casual' ->> 'minMembers')::integer
       or (v_event.team_size_config -> 'casual' ->> 'maxMembers') is not null and sizes.member_count > (v_event.team_size_config -> 'casual' ->> 'maxMembers')::integer
  ) then raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds'; end if;

  perform set_config('spogomi.composition_write_context', 'composition_lock', true);
  update public.spogomi_teams set composition_state = 'locked', updated_at = now() where event_id = p_event_id;
  update public.spogomi_events set state = 'composition_locked', updated_at = now() where id = p_event_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, details)
  select p_event_id, division.id, v_revision, 'composition_lock', p_actor_clerk_id,
         jsonb_build_object('teamCount', count(team.id), 'registeredParticipantCount', count(participant.id))
    from public.spogomi_divisions division
    left join public.spogomi_teams team on team.event_id = p_event_id and team.division_id = division.id
    left join public.spogomi_participants participant on participant.event_id = p_event_id and participant.division_id = division.id and participant.registration_status = 'registered'
   where division.event_id = p_event_id
   group by division.id;
  return jsonb_build_object('already_processed', false, 'locked', true, 'teamCount', v_team_count, 'compositionRevision', v_revision);
end;
$$;

revoke all on function public.spogomi_lock_team_composition(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_lock_team_composition(uuid, bigint, text) to service_role;
