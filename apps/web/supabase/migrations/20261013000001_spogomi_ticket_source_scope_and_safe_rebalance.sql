-- SPOGOMI lot 11A: preserve ticket-provider scope and block unsafe rebalance.
-- This is forward-only: the prior lot migration remains immutable.

alter table public.spogomi_participants
  add column if not exists order_alternative_reference text;

alter table public.spogomi_participants
  drop constraint if exists spogomi_participants_source_system_check;

alter table public.spogomi_participants
  add constraint spogomi_participants_source_system_check
  check (source_system in ('manual_roster', 'cachan_ticketing'));

drop index if exists public.spogomi_participants_event_external_reference_unique;
create unique index spogomi_participants_event_source_external_reference_unique
  on public.spogomi_participants(event_id, source_system, external_reference);

alter table public.spogomi_roster_import_changes
  drop constraint if exists spogomi_roster_import_changes_change_kind_check;

alter table public.spogomi_roster_import_changes
  add constraint spogomi_roster_import_changes_change_kind_check
  check (change_kind in ('ticket_status_changed', 'ticket_cancelled', 'ticket_reactivated', 'ticket_order_changed', 'ticket_advanced_order_changed', 'ticket_identity_changed'));

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
  if v_event.state = 'composition_locked' then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition is locked';
  end if;
  if exists (
    select 1
      from public.spogomi_teams team
     where team.event_id = p_event_id
       and (
         team.composition_state in ('locked', 'verified')
         or team.certified_submission_id is not null
         or exists (select 1 from public.spogomi_team_access_grants grant_row where grant_row.event_id = p_event_id and grant_row.team_id = team.id)
         or exists (select 1 from public.spogomi_result_submissions submission where submission.event_id = p_event_id and submission.team_id = team.id)
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
  ) then
    raise exception using errcode = 'serialization_failure', message = 'A SPOGOMI team with access, results or history cannot be rebalanced by automatic composition';
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
     set team_id = team.id
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

comment on column public.spogomi_participants.order_alternative_reference is
  'Private Weezevent advanced order reference retained for collision and change control; never an identity key.';
