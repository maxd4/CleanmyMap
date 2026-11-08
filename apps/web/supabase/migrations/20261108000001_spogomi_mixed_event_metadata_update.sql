-- SPOGOMI forward-only repair: preserve mixed metadata updates without opening creation.
-- Existing migrations remain immutable; this replaces the guarded RPC in place.

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
  -- PURPOSE: update organizer event metadata while preserving the existing mixed-mode contract.
  -- CALLER: server-only organizer PATCH after Clerk authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; the route owns organizer access.
  -- IDEMPOTENCY: same revision and values are a no-op apart from metadata update.
  -- ATOMICITY: event lock, mode validation, rule validation and update share one transaction.
  -- FAILURE_BEHAVIOR: stale revisions, unauthorized callers and post-lock rule changes fail closed.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role below.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI event updates require the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if p_mode not in ('casual', 'world_cup', 'mixed') then
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
  if p_mode = 'mixed' and v_event.mode <> 'mixed' then
    raise exception using errcode = 'check_violation', message = 'Converting an existing SPOGOMI event to mixed is not allowed';
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

comment on function public.spogomi_update_event_metadata(uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text) is
  'Atomic organizer metadata update. Existing mixed events may preserve mode mixed; this RPC does not convert other modes to mixed, and mode/team-size rules remain immutable after composition lock.';
