-- Scope composition locking to one typed division while preserving the parent
-- revision, existing authorization boundary and the single parent action.

create or replace function public.spogomi_lock_team_composition_for_division(
  p_event_id uuid,
  p_division_id uuid,
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
  v_division public.spogomi_divisions%rowtype;
  v_team_count integer;
  v_revision bigint;
  v_all_locked boolean;
begin
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
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'foreign_key_violation', message = 'SPOGOMI division not found'; end if;
  select count(*)::integer into v_team_count from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id;
  if v_team_count = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI composition locking requires prepared teams'; end if;
  if exists (select 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id and composition_state not in ('draft', 'locked')) then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI division lock state is inconsistent';
  end if;
  if exists (select 1 from public.spogomi_participants where event_id = p_event_id and division_id = p_division_id and registration_status = 'registered' and team_id is null) then
    raise exception using errcode = 'check_violation', message = 'Every registered SPOGOMI place must be assigned before locking';
  end if;
  if v_division.division_type = 'world_cup' and exists (
    select 1 from public.spogomi_teams team
    left join public.spogomi_participants participant on participant.team_id = team.id and participant.event_id = p_event_id and participant.division_id = p_division_id and participant.registration_status = 'registered'
    where team.event_id = p_event_id and team.division_id = p_division_id
    group by team.id having count(participant.id) <> 3
  ) then raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members'; end if;
  if v_division.division_type = 'casual' and exists (
    select 1 from (select team.id, count(participant.id) member_count from public.spogomi_teams team left join public.spogomi_participants participant on participant.team_id = team.id and participant.event_id = p_event_id and participant.division_id = p_division_id and participant.registration_status = 'registered' where team.event_id = p_event_id and team.division_id = p_division_id group by team.id) sizes
    where (v_event.team_size_config -> 'casual' ->> 'minMembers') is not null and sizes.member_count < (v_event.team_size_config -> 'casual' ->> 'minMembers')::integer
       or (v_event.team_size_config -> 'casual' ->> 'maxMembers') is not null and sizes.member_count > (v_event.team_size_config -> 'casual' ->> 'maxMembers')::integer
  ) then raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds'; end if;
  perform set_config('spogomi.composition_write_context', 'composition_lock', true);
  update public.spogomi_teams set composition_state = 'locked', updated_at = now() where event_id = p_event_id and division_id = p_division_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, details)
  values (p_event_id, p_division_id, v_revision, 'composition_lock', p_actor_clerk_id, jsonb_build_object('teamCount', v_team_count));
  select not exists (select 1 from public.spogomi_teams where event_id = p_event_id and composition_state <> 'locked') into v_all_locked;
  if v_all_locked then update public.spogomi_events set state = 'composition_locked', updated_at = now() where id = p_event_id; end if;
  return jsonb_build_object('already_processed', false, 'locked', true, 'divisionId', p_division_id, 'allDivisionsLocked', v_all_locked, 'teamCount', v_team_count, 'compositionRevision', v_revision);
end;
$$;

revoke all on function public.spogomi_lock_team_composition_for_division(uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_lock_team_composition_for_division(uuid, uuid, bigint, text) to service_role;
