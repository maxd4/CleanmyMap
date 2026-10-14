-- SPOGOMI composition replay correction.
-- An identical proposal must be a no-op even when its history is already
-- protected. Any actual move still delegates to the audited v2 procedure.

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
  v_revision bigint;
begin
  -- PURPOSE: preserve idempotent replay before invoking the protected mutator.
  -- CALLER: server-only composition confirmation after organizer authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only through the delegated v2 procedure.
  -- IDEMPOTENCY: an exact current assignment returns already_processed without a history row.
  -- ATOMICITY: parent lock serializes the replay check against concurrent composition writes.
  -- FAILURE_BEHAVIOR: non-identical or malformed proposals delegate to v2 and fail closed.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only.
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  select count(*)::integer, (array_agg(id order by id))[1]
    into v_division_count, v_default_division_id
    from public.spogomi_divisions where event_id = p_event_id;
  if jsonb_typeof(p_assignments) = 'array'
     and jsonb_array_length(p_assignments) = (select count(*) from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered')
     and not exists (
       select 1
         from jsonb_array_elements(p_assignments) item
         left join public.spogomi_participants participant on participant.id = nullif(item ->> 'participantId', '')::uuid and participant.event_id = p_event_id
         left join public.spogomi_teams team on team.event_id = p_event_id
          and team.division_id = coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id)
          and team.team_number = nullif(item ->> 'teamNumber', '')::integer
        where participant.id is null
           or participant.division_id is distinct from coalesce(nullif(item ->> 'divisionId', '')::uuid, v_default_division_id)
           or participant.team_id is distinct from team.id
     ) then
    select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
    return jsonb_build_object('already_processed', true, 'compositionRevision', v_revision);
  end if;
  return public.spogomi_confirm_team_composition_v2(p_event_id, p_expected_revision, p_assignments, p_actor_clerk_id);
end;
$$;

revoke all on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) to service_role;
