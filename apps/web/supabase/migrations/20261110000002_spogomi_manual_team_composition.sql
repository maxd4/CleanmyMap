-- SPOGOMI: organizer-managed draft teams and reserved places.
-- Forward-only. All mutations remain server-role RPCs behind the organizer
-- route guard; no public roster projection is widened by this migration.

alter table public.spogomi_team_composition_mutation_audit
  drop constraint if exists spogomi_team_composition_mutation_audit_action_check;

alter table public.spogomi_team_composition_mutation_audit
  add constraint spogomi_team_composition_mutation_audit_action_check
  check (action in ('manual_move', 'composition_lock', 'team_create', 'manual_place_create', 'private_label_edit'));

create or replace function public.spogomi_create_team_for_division(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_public_name text,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_team public.spogomi_teams%rowtype;
  v_name text;
  v_team_number integer;
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI team creation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI teams can only be created during preparation';
  end if;
  if not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id) then
    raise exception using errcode = 'check_violation', message = 'The selected SPOGOMI division is invalid';
  end if;

  v_team_number := coalesce((select max(team_number) + 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id), 1);
  v_name := public.spogomi_normalize_team_public_name(nullif(btrim(coalesce(p_public_name, '')), ''));
  if v_name is null or length(v_name) = 0 then v_name := 'Équipe ' || v_team_number::text; end if;
  if length(v_name) > 60 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode = 'check_violation', message = 'The team public name must contain between 1 and 60 characters';
  end if;
  if exists (select 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id and public.spogomi_team_public_name_key(public_name) = public.spogomi_team_public_name_key(v_name)) then
    raise exception using errcode = 'unique_violation', message = 'This team public name is already used in this division';
  end if;

  insert into public.spogomi_teams(event_id, division_id, team_number, public_name, composition_state)
  values (p_event_id, p_division_id, v_team_number, v_name, 'draft')
  returning * into v_team;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, team_id, details)
  values (p_event_id, p_division_id, v_revision, 'team_create', p_actor_clerk_id, v_team.id, jsonb_build_object('source', 'organizer_preparation', 'publicName', v_name));
  return jsonb_build_object('already_processed', false, 'team', jsonb_build_object('id', v_team.id, 'divisionId', v_team.division_id, 'teamNumber', v_team.team_number, 'publicName', v_team.public_name, 'compositionState', v_team.composition_state), 'compositionRevision', v_revision);
end;
$$;

create or replace function public.spogomi_create_manual_place_for_division(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_private_label text,
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
  v_label text := public.spogomi_normalize_team_public_name(nullif(btrim(coalesce(p_private_label, '')), ''));
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI place creation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if v_label is null or length(v_label) = 0 or length(v_label) > 160 or v_label ~ '[[:cntrl:]]' then
    raise exception using errcode = 'check_violation', message = 'The private place label must contain between 1 and 160 characters';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI places can only be created during preparation';
  end if;
  if not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id) then
    raise exception using errcode = 'check_violation', message = 'The selected SPOGOMI division is invalid';
  end if;

  insert into public.spogomi_participants(event_id, division_id, source_system, display_name, identity_status, registration_status, attendance_status, account_link_status)
  values (p_event_id, p_division_id, 'manual_roster', v_label, 'unknown', 'registered', 'unknown', 'unlinked')
  returning * into v_participant;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, participant_id, details)
  values (p_event_id, p_division_id, v_revision, 'manual_place_create', p_actor_clerk_id, v_participant.id, jsonb_build_object('source', 'organizer_preparation'));
  return jsonb_build_object('already_processed', false, 'participant', jsonb_build_object('id', v_participant.id, 'divisionId', v_participant.division_id, 'displayName', v_participant.display_name, 'teamId', v_participant.team_id), 'compositionRevision', v_revision);
end;
$$;

create or replace function public.spogomi_update_participant_private_label(
  p_event_id uuid,
  p_division_id uuid,
  p_participant_id uuid,
  p_expected_revision bigint,
  p_expected_private_label text,
  p_private_label text,
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
  v_label text := public.spogomi_normalize_team_public_name(nullif(btrim(coalesce(p_private_label, '')), ''));
  v_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI place-label updates require the server role';
  end if;
  if v_label is null or length(v_label) = 0 or length(v_label) > 160 or v_label ~ '[[:cntrl:]]' then
    raise exception using errcode = 'check_violation', message = 'The private place label must contain between 1 and 160 characters';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found or v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI place labels can only be edited during preparation';
  end if;
  select * into v_participant from public.spogomi_participants where id = p_participant_id and event_id = p_event_id and division_id = p_division_id for update;
  if not found or v_participant.registration_status <> 'registered' then
    raise exception using errcode = 'no_data_found', message = 'Registered SPOGOMI place not found in this division';
  end if;
  if v_participant.display_name is distinct from p_expected_private_label then
    raise exception using errcode = 'serialization_failure', message = 'The private place label changed since the page was loaded';
  end if;
  if v_participant.team_id is not null and exists (select 1 from public.spogomi_teams where id = v_participant.team_id and event_id = p_event_id and division_id = p_division_id and composition_state in ('locked', 'verified')) then
    raise exception using errcode = 'check_violation', message = 'A locked SPOGOMI team requires an explicit audited correction procedure';
  end if;
  if v_participant.display_name is not distinct from v_label then
    return jsonb_build_object('already_processed', true, 'participantId', v_participant.id, 'displayName', v_participant.display_name, 'compositionRevision', v_event.composition_revision);
  end if;

  update public.spogomi_participants set display_name = v_label, updated_at = now() where id = v_participant.id and event_id = p_event_id and division_id = p_division_id;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, participant_id, team_id, details)
  values (p_event_id, p_division_id, v_revision, 'private_label_edit', p_actor_clerk_id, v_participant.id, v_participant.team_id, jsonb_build_object('source', 'organizer_preparation', 'previousLabel', v_participant.display_name, 'privateLabel', v_label));
  return jsonb_build_object('already_processed', false, 'participantId', v_participant.id, 'displayName', v_label, 'compositionRevision', v_revision);
end;
$$;

revoke all on function public.spogomi_create_team_for_division(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.spogomi_create_manual_place_for_division(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.spogomi_update_participant_private_label(uuid, uuid, uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_create_team_for_division(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.spogomi_create_manual_place_for_division(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.spogomi_update_participant_private_label(uuid, uuid, uuid, bigint, text, text, text) to service_role;

comment on function public.spogomi_create_team_for_division(uuid, uuid, bigint, text, text) is
  'Creates one organizer-owned draft team in exactly one division without requiring a roster import.';
comment on function public.spogomi_create_manual_place_for_division(uuid, uuid, bigint, text, text) is
  'Creates one private reserved place; its label is not a verified physical identity or public projection.';
comment on function public.spogomi_update_participant_private_label(uuid, uuid, uuid, bigint, text, text, text) is
  'Audited optimistic-concurrency edit of a private organizer place label; it never changes identity verification.';
