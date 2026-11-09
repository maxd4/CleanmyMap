-- SPOGOMI event metadata invoker repair after 20261109152000.
--
-- PURPOSE: restore the server-owned event metadata mutation without delegating
-- from an invoker RPC to an EXECUTE-revoked private function.
-- SECURITY: the single public owner remains SECURITY INVOKER and service_role
-- only; the verified actor is stamped in the same transaction before mutation.
-- CONTRACT: preserve the existing lock, revision, mode, composition and parent
-- coherence checks, plus append-only history and notification triggers.
-- MIGRATION: forward-only; no historical migration is rewritten.

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
  v_casual_config jsonb;
  v_min_json jsonb;
  v_max_json jsonb;
  v_min_members integer;
  v_max_members integer;
  v_rules_changed boolean;
  v_revision bigint;
begin
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
  if v_event.mode is distinct from p_mode then
    raise exception using errcode = 'check_violation', message = 'Changing the mode of an existing SPOGOMI event is not allowed';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event changed since the page was loaded';
  end if;

  v_rules_changed := v_event.team_size_config is distinct from p_team_size_config;
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

  v_casual_config := p_team_size_config -> 'casual';
  v_min_json := v_casual_config -> 'minMembers';
  v_max_json := v_casual_config -> 'maxMembers';
  if p_mode in ('casual', 'mixed') then
    if (v_min_json is not null and jsonb_typeof(v_min_json) not in ('number', 'null'))
       or (v_max_json is not null and jsonb_typeof(v_max_json) not in ('number', 'null'))
       or (jsonb_typeof(v_min_json) = 'number' and (v_min_json #>> '{}') !~ '^-?[0-9]+$')
       or (jsonb_typeof(v_max_json) = 'number' and (v_max_json #>> '{}') !~ '^-?[0-9]+$') then
      raise exception using errcode = 'check_violation', message = 'Casual team-size bounds must be positive integers or null';
    end if;
    v_min_members := case when jsonb_typeof(v_min_json) = 'number' then (v_min_json #>> '{}')::integer else null end;
    v_max_members := case when jsonb_typeof(v_max_json) = 'number' then (v_max_json #>> '{}')::integer else null end;
    if (v_min_members is not null and v_min_members < 1)
       or (v_max_members is not null and v_max_members < 1)
       or (v_min_members is not null and v_max_members is not null and v_min_members > v_max_members) then
      raise exception using errcode = 'check_violation', message = 'Casual team-size bounds are invalid';
    end if;
  end if;

  if v_rules_changed and p_mode = 'world_cup' and exists (
    select 1
      from public.spogomi_teams team
      join public.spogomi_divisions division on division.id = team.division_id
      left join public.spogomi_participants participant
        on participant.team_id = team.id
       and participant.event_id = p_event_id
       and participant.registration_status = 'registered'
     where team.event_id = p_event_id
       and division.division_type = 'world_cup'
     group by team.id
    having count(participant.id) <> 3
  ) then
    raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members';
  end if;
  if v_rules_changed and p_mode in ('casual', 'mixed') and exists (
    select 1
      from (
        select team.id, count(participant.id) as member_count
          from public.spogomi_teams team
          join public.spogomi_divisions division on division.id = team.division_id
          left join public.spogomi_participants participant
            on participant.team_id = team.id
           and participant.event_id = p_event_id
           and participant.registration_status = 'registered'
         where team.event_id = p_event_id
           and division.division_type = 'casual'
         group by team.id
      ) team_sizes
     where (v_min_members is not null and member_count < v_min_members)
        or (v_max_members is not null and member_count > v_max_members)
  ) then
    raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
  end if;

  perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true);
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

revoke all on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text
) to service_role;

-- The renamed implementation must not remain as an alternate executable path.
drop function public.spogomi_update_event_metadata_apply(
  uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text
);

comment on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text
) is
  'Single server-only invoker owner for atomic SPOGOMI metadata updates. It stamps the verified actor before the locked mutation and preserves mode, composition and revision guards.';
