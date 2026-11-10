-- SPOGOMI: save one organizer's local team editor draft in one transaction.
-- Forward-only. The route owns Clerk AuthN/AuthZ; this RPC remains service-role only.

alter table public.spogomi_team_composition_mutation_audit
  drop constraint if exists spogomi_team_composition_mutation_audit_action_check;

alter table public.spogomi_team_composition_mutation_audit
  add constraint spogomi_team_composition_mutation_audit_action_check
  check (action in ('manual_move', 'composition_lock', 'team_create', 'manual_place_create', 'private_label_edit', 'manual_batch_save'));

create or replace function public.spogomi_save_team_composition_draft_for_division(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_teams jsonb,
  p_participants jsonb,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_item jsonb;
  v_team public.spogomi_teams%rowtype;
  v_participant public.spogomi_participants%rowtype;
  v_name text;
  v_label text;
  v_team_id uuid;
  v_team_number integer;
  v_revision bigint;
  v_team_map jsonb := '{}'::jsonb;
  v_changed boolean := false;
  v_existing_teams integer;
  v_existing_participants integer;
  v_public_name_changed boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI draft save requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if jsonb_typeof(p_teams) <> 'array' or jsonb_typeof(p_participants) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'The team draft must contain JSON arrays';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since the page was loaded';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI team drafts can only be saved during preparation';
  end if;
  if not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id) then
    raise exception using errcode = 'check_violation', message = 'The selected SPOGOMI division is invalid';
  end if;
  -- Reuse the audited write contexts enforced by the existing composition and
  -- public-name triggers; this RPC does not create a second authorization path.
  perform set_config('spogomi.composition_write_context', 'composition_manual_move', true);
  perform set_config('spogomi.team_name_write_context', 'team_name_rename', true);

  select count(*) into v_existing_teams from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id;
  if v_existing_teams <> (select count(*) from jsonb_array_elements(p_teams) item where item->>'id' is not null) then
    raise exception using errcode = 'serialization_failure', message = 'The team draft cannot silently remove a persisted team';
  end if;
  if exists (select 1 from jsonb_array_elements(p_teams) item where (item->>'id' is null) = (item->>'clientKey' is null)) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Each team must have exactly one persisted id or local key';
  end if;
  if exists (select 1 from (select item->>'id' as id from jsonb_array_elements(p_teams) item where item->>'id' is not null group by item->>'id' having count(*) > 1) duplicate) then
    raise exception using errcode = 'invalid_parameter_value', message = 'A persisted team appears more than once';
  end if;
  if exists (select 1 from public.spogomi_teams team where team.event_id = p_event_id and team.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_teams) item where (item->>'id')::uuid = team.id)) then
    raise exception using errcode = 'serialization_failure', message = 'The team draft is incomplete';
  end if;

  for v_item in select value from jsonb_array_elements(p_teams)
  loop
    v_name := public.spogomi_normalize_team_public_name(nullif(btrim(v_item->>'publicName'), ''));
    if v_name is null or length(v_name) > 60 or v_name ~ '[[:cntrl:]]' then
      raise exception using errcode = 'check_violation', message = 'The team public name must contain between 1 and 60 characters';
    end if;
    if v_item->>'id' is null then
      if exists (select 1 from jsonb_array_elements(p_teams) other where other->>'id' is distinct from null and public.spogomi_team_public_name_key(other->>'publicName') = public.spogomi_team_public_name_key(v_name)) then
        raise exception using errcode = 'unique_violation', message = 'This team public name is already used in this division';
      end if;
      if exists (select 1 from jsonb_array_elements(p_teams) other where other->>'clientKey' = v_item->>'clientKey' and other <> v_item) then
        raise exception using errcode = 'invalid_parameter_value', message = 'A local team key appears more than once';
      end if;
      v_team_number := coalesce((select max(team_number) + 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id), 1);
      insert into public.spogomi_teams(event_id, division_id, team_number, public_name, composition_state)
      values (p_event_id, p_division_id, v_team_number, v_name, 'draft') returning * into v_team;
      v_team_map := v_team_map || jsonb_build_object(v_item->>'clientKey', v_team.id::text);
      v_changed := true;
    else
      select * into v_team from public.spogomi_teams where id = (v_item->>'id')::uuid and event_id = p_event_id and division_id = p_division_id for update;
      if not found then raise exception using errcode = 'serialization_failure', message = 'A team is no longer part of this division'; end if;
      if v_team.composition_state <> 'draft' or v_team.certified_submission_id is not null then
        raise exception using errcode = 'check_violation', message = 'A locked SPOGOMI team requires an explicit audited correction procedure';
      end if;
      if exists (select 1 from public.spogomi_teams other where other.event_id = p_event_id and other.division_id = p_division_id and other.id <> v_team.id and public.spogomi_team_public_name_key(other.public_name) = public.spogomi_team_public_name_key(v_name)) then
        raise exception using errcode = 'unique_violation', message = 'This team public name is already used in this division';
      end if;
      if v_team.public_name is distinct from v_name then
        if v_team.public_name is distinct from nullif(btrim(v_item->>'expectedPublicName'), '') then
          raise exception using errcode = 'serialization_failure', message = 'A team public name changed since the page was loaded';
        end if;
        update public.spogomi_teams set public_name = v_name, updated_at = now() where id = v_team.id;
        v_changed := true;
        v_public_name_changed := true;
      end if;
    end if;
  end loop;

  select count(*) into v_existing_participants from public.spogomi_participants where event_id = p_event_id and division_id = p_division_id and registration_status = 'registered';
  if v_existing_participants <> (select count(*) from jsonb_array_elements(p_participants) item where item->>'id' is not null) then
    raise exception using errcode = 'serialization_failure', message = 'The participant draft cannot silently remove a persisted place';
  end if;
  if exists (select 1 from jsonb_array_elements(p_participants) item where (item->>'id' is null) = (item->>'clientKey' is null)) then
    raise exception using errcode = 'invalid_parameter_value', message = 'Each place must have exactly one persisted id or local key';
  end if;
  if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.division_id = p_division_id and participant.registration_status = 'registered' and not exists (select 1 from jsonb_array_elements(p_participants) item where (item->>'id')::uuid = participant.id)) then
    raise exception using errcode = 'serialization_failure', message = 'The participant draft is incomplete';
  end if;

  for v_item in select value from jsonb_array_elements(p_participants)
  loop
    v_team_id := null;
    if nullif(v_item->>'teamKey', '') is not null then
      if v_team_map ? (v_item->>'teamKey') then v_team_id := (v_team_map->>(v_item->>'teamKey'))::uuid;
      else v_team_id := (v_item->>'teamKey')::uuid;
      end if;
      if not exists (select 1 from public.spogomi_teams where id = v_team_id and event_id = p_event_id and division_id = p_division_id) then
        raise exception using errcode = 'check_violation', message = 'A place targets an invalid team in this division';
      end if;
      if exists (select 1 from public.spogomi_teams where id = v_team_id and composition_state in ('locked', 'verified')) then
        raise exception using errcode = 'check_violation', message = 'A locked SPOGOMI team requires an explicit audited correction procedure';
      end if;
    end if;
    v_label := nullif(btrim(v_item->>'privateLabel'), '');
    if v_item->>'id' is null then
      if v_label is null or length(v_label) > 160 or v_label ~ '[[:cntrl:]]' then raise exception using errcode = 'check_violation', message = 'The private place label must contain between 1 and 160 characters'; end if;
      insert into public.spogomi_participants(event_id, division_id, source_system, display_name, identity_status, registration_status, attendance_status, account_link_status, team_id)
      values (p_event_id, p_division_id, 'manual_roster', v_label, 'unknown', 'registered', 'unknown', 'unlinked', v_team_id);
      v_changed := true;
    else
      select * into v_participant from public.spogomi_participants where id = (v_item->>'id')::uuid and event_id = p_event_id and division_id = p_division_id and registration_status = 'registered' for update;
      if not found then raise exception using errcode = 'serialization_failure', message = 'A place is no longer part of this division'; end if;
      if v_participant.team_id is not null and exists (select 1 from public.spogomi_teams where id = v_participant.team_id and composition_state in ('locked', 'verified')) then raise exception using errcode = 'check_violation', message = 'A locked SPOGOMI team requires an explicit audited correction procedure'; end if;
      if v_participant.display_name is distinct from v_label or v_participant.team_id is distinct from v_team_id then
        update public.spogomi_participants set display_name = v_label, team_id = v_team_id, updated_at = now() where id = v_participant.id;
        v_changed := true;
      end if;
    end if;
  end loop;

  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  if v_changed then
    if v_revision <> p_expected_revision then
      insert into public.spogomi_team_composition_mutation_audit(event_id, division_id, revision, action, actor_clerk_id, details)
      values (p_event_id, p_division_id, v_revision, 'manual_batch_save', p_actor_clerk_id, jsonb_build_object('source', 'organizer_preparation', 'teamCount', jsonb_array_length(p_teams), 'participantCount', jsonb_array_length(p_participants)));
    elsif v_public_name_changed then
      insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, details)
      values (gen_random_uuid()::text, p_actor_clerk_id, 'admin_operation', 'success', p_event_id::text, jsonb_build_object('operation', 'spogomi_team_draft_save', 'divisionId', p_division_id, 'teamCount', jsonb_array_length(p_teams), 'participantCount', jsonb_array_length(p_participants)));
    end if;
  end if;
  return jsonb_build_object('already_processed', not v_changed, 'divisionId', p_division_id, 'compositionRevision', v_revision);
end;
$$;

revoke all on function public.spogomi_save_team_composition_draft_for_division(uuid, uuid, bigint, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_save_team_composition_draft_for_division(uuid, uuid, bigint, jsonb, jsonb, text) to service_role;

comment on function public.spogomi_save_team_composition_draft_for_division(uuid, uuid, bigint, jsonb, jsonb, text) is
  'Atomically saves one organizer local team draft for one division; persisted rows cannot be removed or moved across divisions.';
