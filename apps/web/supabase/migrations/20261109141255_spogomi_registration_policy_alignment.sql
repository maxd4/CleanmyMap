-- SPOGOMI registration policy alignment.
--
-- PURPOSE: make edition/division policy precedence and registration capacity
-- identical for readiness, requests and approvals.
-- CALLER: service_role through the existing RPCs.
-- AUTHORIZATION_BOUNDARY: no grants are widened; these helpers are revoked.
-- IDEMPOTENCY: CREATE OR REPLACE only; no data is written by the helpers.
-- ATOMICITY: callers keep their existing event/request row locks.
-- FAILURE_BEHAVIOR: invalid or incoherent division structure makes readiness
-- false; missing division context is rejected by the admission RPC.
-- SEARCH_PATH: pg_catalog, public.
-- GRANTS: service_role only on the public RPCs; helpers remain non-public.

create or replace function public.spogomi_registration_policy_for_division(
  p_event_id uuid,
  p_division_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_policy jsonb;
  v_division_policy jsonb;
begin
  select coalesce(regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_event_policy
    from public.spogomi_events
   where id = p_event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found';
  end if;
  select coalesce(regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_division_policy
    from public.spogomi_divisions
   where id = p_division_id and event_id = p_event_id;
  if not found then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;
  return v_event_policy || v_division_policy;
end;
$$;

create or replace function public.create_spogomi_admission_request(
  p_event_id uuid, p_team_id uuid, p_requester_clerk_id text, p_request_kind text,
  p_division_id uuid, p_provided_context text
)
returns table (request_id uuid, request_status text, request_kind text, request_team_id uuid, request_division_id uuid)
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_existing public.spogomi_team_join_requests%rowtype;
  v_division_id uuid := p_division_id;
  v_division_count integer;
  v_policy jsonb;
  v_capacity_info jsonb;
  v_quiz_version text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception using errcode = '42501', message = 'SPOGOMI admission requests require the server role'; end if;
  if p_request_kind not in ('team_join', 'registration', 'presence_regularization') or length(btrim(coalesce(p_requester_clerk_id, ''))) = 0 or length(coalesce(p_provided_context, '')) > 1200 then raise exception using errcode = '22023', message = 'invalid_spogomi_admission_request'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_requester_clerk_id, p_request_kind), 0));
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable'; end if;
  select count(*)::integer into v_division_count from public.spogomi_divisions where event_id = p_event_id;
  if v_division_id is null and v_division_count = 1 then select min(id) into v_division_id from public.spogomi_divisions where event_id = p_event_id; end if;
  if v_division_id is null or not exists (select 1 from public.spogomi_divisions where id = v_division_id and event_id = p_event_id) then raise exception using errcode = '22023', message = 'spogomi_admission_division_required'; end if;
  if v_event.mode = 'mixed' and p_division_id is null then raise exception using errcode = '22023', message = 'spogomi_admission_division_required'; end if;
  if p_team_id is not null and not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = v_division_id) then raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable'; end if;
  v_policy := public.spogomi_registration_policy_for_division(p_event_id, v_division_id);
  if p_request_kind = 'registration' then
    if v_event.state <> 'registration_open' or coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed'; end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required'; end if;
    if v_event.mode = 'world_cup' or exists (select 1 from public.spogomi_divisions where id = v_division_id and division_type = 'world_cup') then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required'; end if;
    end if;
  elsif p_request_kind = 'presence_regularization' and v_event.state not in ('in_progress', 'judging') then raise exception using errcode = '42501', message = 'spogomi_presence_regularization_closed';
  elsif p_request_kind = 'team_join' and p_team_id is null then raise exception using errcode = '22023', message = 'spogomi_team_join_team_required'; end if;
  select * into v_existing from public.spogomi_team_join_requests request where request.event_id = p_event_id and request.requester_clerk_id = btrim(p_requester_clerk_id) and request.request_kind = p_request_kind and request.status in ('pending', 'approved') order by request.created_at desc limit 1 for update;
  if found then
    if v_existing.division_id is distinct from v_division_id or v_existing.team_id is distinct from p_team_id then raise exception using errcode = '23505', message = 'spogomi_admission_request_scope_conflict'; end if;
    return query select v_existing.id, v_existing.status, v_existing.request_kind, v_existing.team_id, v_existing.division_id; return;
  end if;
  if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.clerk_id = btrim(p_requester_clerk_id) and participant.account_link_status = 'verified' and participant.registration_status = 'registered') then raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event'; end if;
  if p_request_kind = 'registration' then
    v_capacity_info := public.spogomi_registration_capacity_for_division(p_event_id, v_division_id);
    if (v_capacity_info ->> 'capacity') is not null and (v_capacity_info ->> 'registeredCount')::integer >= (v_capacity_info ->> 'capacity')::integer then raise exception using errcode = '42501', message = 'spogomi_registration_capacity_reached'; end if;
    if coalesce((public.spogomi_registration_readiness(p_event_id) ->> 'ready')::boolean, false) = false then raise exception using errcode = '42501', message = 'spogomi_registration_readiness_incomplete'; end if;
    v_quiz_version := public.spogomi_registration_quiz_definition(p_event_id, v_division_id) ->> 'quizVersion';
    if not exists (select 1 from public.spogomi_registration_quiz_proofs proof where proof.event_id = p_event_id and proof.division_id = v_division_id and proof.clerk_id = btrim(p_requester_clerk_id) and proof.quiz_version = v_quiz_version and proof.registration_contract_revision = v_event.registration_contract_revision) then raise exception using errcode = '42501', message = 'spogomi_registration_quiz_required'; end if;
  end if;
  insert into public.spogomi_team_join_requests (event_id, team_id, requester_clerk_id, request_kind, division_id, provided_context) values (p_event_id, p_team_id, btrim(p_requester_clerk_id), p_request_kind, v_division_id, btrim(coalesce(p_provided_context, ''))) returning * into v_existing;
  insert into public.spogomi_team_join_request_events (request_id, event_id, status, actor_kind, actor_clerk_id, details) values (v_existing.id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id), jsonb_build_object('request_kind', p_request_kind, 'division_id', v_division_id, 'registration_contract_revision', v_event.registration_contract_revision, 'quiz_version', v_quiz_version));
  return query select v_existing.id, 'pending'::text, p_request_kind, p_team_id, v_division_id;
end;
$$;

revoke all on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) to service_role;

create or replace function public.spogomi_registration_capacity_for_division(
  p_event_id uuid,
  p_division_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_policy jsonb := public.spogomi_registration_policy_for_division(p_event_id, p_division_id);
  v_capacity integer;
  v_registered_count integer;
begin
  if (v_policy ->> 'capacity') ~ '^[1-9][0-9]*$' then
    v_capacity := (v_policy ->> 'capacity')::integer;
  end if;
  select count(*)::integer into v_registered_count
    from public.spogomi_participants
   where event_id = p_event_id
     and division_id = p_division_id
     and registration_status = 'registered';
  return jsonb_build_object(
    'policy', v_policy,
    'capacity', v_capacity,
    'registeredCount', v_registered_count,
    'available', v_capacity is null or v_registered_count < v_capacity
  );
end;
$$;

create or replace function public.spogomi_registration_readiness(p_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_policy jsonb;
  v_edition_items jsonb;
  v_divisions jsonb := '[]'::jsonb;
  v_division record;
  v_items jsonb;
  v_division_ready boolean;
  v_ready boolean := true;
  v_structure_valid boolean;
  v_minors_applicable boolean;
begin
  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;

  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  v_minors_applicable := case when jsonb_typeof(v_policy -> 'minorsApplicable') = 'boolean' then (v_policy ->> 'minorsApplicable')::boolean else null end;
  v_edition_items := jsonb_build_array(
    jsonb_build_object('id', 'meeting_point', 'label', 'Lieu de rendez-vous', 'status', case when length(btrim(coalesce(v_event.location_label, ''))) > 0 and v_event.location_label <> 'Lieu à préciser' then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-event-information'),
    jsonb_build_object('id', 'collection_scope', 'label', 'Périmètre de collecte', 'status', case when exists (select 1 from public.spogomi_event_routes route where route.event_id = p_event_id and route.point_count >= 2 and jsonb_typeof(route.geometry_geojson) = 'object') then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-route'),
    jsonb_build_object('id', 'safety_instructions', 'label', 'Consignes de sécurité', 'status', case when length(btrim(coalesce(v_policy ->> 'safetyInstructions', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'safetyInstructionsVerified') = 'boolean' and (v_policy ->> 'safetyInstructionsVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'organization_contact', 'label', 'Contact d’organisation', 'status', case when length(btrim(coalesce(v_policy ->> 'organizationContact', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'organizationContactVerified') = 'boolean' and (v_policy ->> 'organizationContactVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'assistance_procedure', 'label', 'Procédure d’assistance', 'status', case when length(btrim(coalesce(v_policy ->> 'assistanceProcedure', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'assistanceProcedureVerified') = 'boolean' and (v_policy ->> 'assistanceProcedureVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'minor_information', 'label', 'Informations utiles aux mineurs', 'status', case when v_minors_applicable is null then 'incomplete' when v_minors_applicable = false then 'complete' when length(btrim(coalesce(v_policy ->> 'minorInformation', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'minorInformationVerified') = 'boolean' and (v_policy ->> 'minorInformationVerified')::boolean then 'complete' else 'not_verified' end, 'required', coalesce(v_minors_applicable, true), 'href', '#spogomi-registration-readiness')
  );
  if exists (select 1 from jsonb_array_elements(v_edition_items) item where (item ->> 'required')::boolean and item ->> 'status' <> 'complete') then v_ready := false; end if;

  select case
    when v_event.mode = 'casual' then count(*) = 1 and count(*) filter (where division_type = 'casual') = 1
    when v_event.mode = 'world_cup' then count(*) = 1 and count(*) filter (where division_type = 'world_cup') = 1
    when v_event.mode = 'mixed' then count(*) = 2 and count(*) filter (where division_type = 'casual') = 1 and count(*) filter (where division_type = 'world_cup') = 1
    else false
  end into v_structure_valid
    from public.spogomi_divisions where event_id = p_event_id;
  if not coalesce(v_structure_valid, false) then v_ready := false; end if;

  for v_division in select d.id, d.division_type, d.regulation_version, d.regulation_config from public.spogomi_divisions d where d.event_id = p_event_id order by d.division_type loop
    v_policy := public.spogomi_registration_policy_for_division(p_event_id, v_division.id);
    v_items := jsonb_build_array(
      jsonb_build_object('id', 'regulation', 'label', 'Règlement applicable, version et source', 'status', case when public.spogomi_division_regulation_is_complete(p_event_id, v_division.id, v_division.regulation_version) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id),
      jsonb_build_object('id', 'categories', 'label', 'Catégories et barèmes', 'status', case when exists (select 1 from public.spogomi_category_rules category where category.event_id = p_event_id and category.division_id = v_division.id and category.regulation_version = v_division.regulation_version) and not exists (select 1 from public.spogomi_category_rules category where category.event_id = p_event_id and category.division_id = v_division.id and category.regulation_version = v_division.regulation_version and (not category.is_complete or length(btrim(category.code)) = 0 or length(btrim(category.label)) = 0 or length(btrim(category.unit)) = 0)) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id),
      jsonb_build_object('id', 'schedule', 'label', 'Horaires officiels', 'status', case when exists (select 1 from public.spogomi_field_operations operation where operation.event_id = p_event_id and operation.division_id = v_division.id and operation.regulation_version = v_division.regulation_version and exists (select 1 from pg_timezone_names zone where zone.name = operation.timezone_name) and operation.official_start_at is not null and operation.collection_limit_at is not null and operation.sorting_limit_at is not null and operation.weighing_start_at is not null and operation.weighing_end_at is not null) then 'complete' else 'incomplete' end, 'required', true, 'href', '#operations'),
      jsonb_build_object('id', 'capacity', 'label', 'Capacité d’inscription', 'status', case when coalesce((v_policy ->> 'capacity') ~ '^[1-9][0-9]*$', false) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-registration-readiness'),
      jsonb_build_object('id', 'eligibility', 'label', 'Conditions d’éligibilité', 'status', case when jsonb_typeof(v_division.regulation_config -> 'eligibility') = 'object' and jsonb_typeof(v_division.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean' then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id)
    );
    select not exists (select 1 from jsonb_array_elements(v_items) item where (item ->> 'required')::boolean and item ->> 'status' <> 'complete') into v_division_ready;
    if not v_division_ready then v_ready := false; end if;
    v_divisions := v_divisions || jsonb_build_array(jsonb_build_object('divisionId', v_division.id, 'divisionType', v_division.division_type, 'ready', v_division_ready and v_structure_valid, 'items', v_items));
  end loop;
  return jsonb_build_object('eventId', p_event_id, 'ready', v_ready, 'policy', coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb), 'divisionStructureValid', coalesce(v_structure_valid, false), 'editionItems', v_edition_items, 'divisions', v_divisions);
end;
$$;

create or replace function public.transition_spogomi_admission_request(
  p_request_id uuid, p_event_id uuid, p_target_status text, p_actor_kind text,
  p_actor_clerk_id text, p_actor_role text, p_matched_participant_id uuid,
  p_verification_note text, p_resolution_note text, p_decision_message text
)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
  v_request public.spogomi_team_join_requests%rowtype;
  v_event public.spogomi_events%rowtype;
  v_participant public.spogomi_participants%rowtype;
  v_policy jsonb := '{}'::jsonb;
  v_capacity_info jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_target_status not in ('approved', 'rejected', 'cancelled') or p_actor_kind not in ('requester', 'admin') or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_admission_transition';
  end if;
  select * into v_request from public.spogomi_team_join_requests where id = p_request_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable'; end if;
  if p_target_status = 'cancelled' then
    if p_actor_kind <> 'requester' or btrim(p_actor_clerk_id) <> v_request.requester_clerk_id then raise exception using errcode = '42501', message = 'spogomi_admission_requester_required'; end if;
  elsif p_actor_kind <> 'admin' or p_actor_role not in ('admin', 'max') or btrim(p_actor_clerk_id) = v_request.requester_clerk_id then
    raise exception using errcode = '42501', message = 'spogomi_admission_admin_required';
  end if;
  if v_request.status = p_target_status then return to_jsonb(v_request); end if;
  if not public.spogomi_admission_transition_allowed(v_request.status, p_target_status) then raise exception using errcode = '40001', message = 'spogomi_admission_request_already_resolved'; end if;
  if p_target_status = 'approved' and v_request.request_kind = 'team_join' and (p_matched_participant_id is null or length(btrim(coalesce(p_verification_note, ''))) < 10) then raise exception using errcode = '42501', message = 'spogomi_admission_verification_required'; end if;
  if p_target_status = 'approved' and v_request.request_kind = 'registration' and length(btrim(coalesce(p_verification_note, ''))) < 10 then raise exception using errcode = '42501', message = 'spogomi_registration_verification_required'; end if;
  if p_target_status = 'approved' and v_request.request_kind = 'presence_regularization' and length(btrim(coalesce(p_verification_note, ''))) < 10 then raise exception using errcode = '42501', message = 'spogomi_presence_verification_required'; end if;
  if p_target_status = 'approved' and v_request.request_kind = 'team_join' then
    select * into v_participant from public.spogomi_participants where id = p_matched_participant_id and event_id = p_event_id and team_id = v_request.team_id and registration_status = 'registered' and account_link_status <> 'verified' for update;
    if not found then raise exception using errcode = '42501', message = 'spogomi_team_join_participant_mismatch'; end if;
    if exists (select 1 from public.spogomi_participants where event_id = p_event_id and clerk_id = v_request.requester_clerk_id and account_link_status = 'verified' and registration_status = 'registered') then raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event'; end if;
    update public.spogomi_participants set account_link_status = 'verified', clerk_id = v_request.requester_clerk_id, identity_link_code_hash = null, identity_link_code_expires_at = null, identity_link_code_revoked_at = now(), updated_at = now() where id = v_participant.id and event_id = p_event_id;
    insert into public.spogomi_identity_link_events(event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome, reason) values (p_event_id, v_participant.id, 'admin_approved', 'admin', p_actor_clerk_id, 'success', 'team_join_request_verified');
  elsif p_target_status = 'approved' and v_request.request_kind = 'registration' then
    select * into v_event from public.spogomi_events where id = p_event_id for update;
    if v_event.state <> 'registration_open' then raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed'; end if;
    v_policy := public.spogomi_registration_policy_for_division(p_event_id, v_request.division_id);
    if coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed'; end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required'; end if;
    if v_event.mode = 'world_cup' or exists (select 1 from public.spogomi_divisions where id = v_request.division_id and division_type = 'world_cup') then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required'; end if;
    end if;
    v_capacity_info := public.spogomi_registration_capacity_for_division(p_event_id, v_request.division_id);
    if (v_capacity_info ->> 'capacity') is not null and (v_capacity_info ->> 'registeredCount')::integer >= (v_capacity_info ->> 'capacity')::integer then raise exception using errcode = '42501', message = 'spogomi_registration_capacity_reached'; end if;
    if exists (select 1 from public.spogomi_participants where event_id = p_event_id and clerk_id = v_request.requester_clerk_id and account_link_status = 'verified' and registration_status = 'registered') then raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event'; end if;
    select * into v_participant from public.spogomi_participants where event_id = p_event_id and division_id = v_request.division_id and clerk_id = v_request.requester_clerk_id and account_link_status = 'verified' and registration_status = 'withdrawn' and source_system = 'direct_registration' order by updated_at desc limit 1 for update;
    if found then
      update public.spogomi_participants set registration_status = 'registered', attendance_status = 'unknown', updated_at = now() where id = v_participant.id and event_id = p_event_id;
      insert into public.spogomi_participant_lifecycle_events(event_id, participant_id, from_status, to_status, actor_kind, actor_clerk_id, reason) values (p_event_id, v_participant.id, 'withdrawn', 'registered', 'admin', p_actor_clerk_id, 'direct_registration_reopened');
    else
      insert into public.spogomi_participants(event_id, division_id, source_system, identity_status, registration_status, attendance_status, account_link_status, clerk_id) values (p_event_id, v_request.division_id, 'direct_registration', 'identified', 'registered', 'unknown', 'verified', v_request.requester_clerk_id) returning * into v_participant;
    end if;
    p_matched_participant_id := v_participant.id;
  end if;
  update public.spogomi_team_join_requests set status = p_target_status, matched_participant_id = case when p_target_status = 'approved' and v_request.request_kind in ('team_join', 'registration') then p_matched_participant_id else null end, verification_note = case when p_target_status = 'approved' then nullif(btrim(p_verification_note), '') else null end, resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''), decision_message = nullif(btrim(coalesce(p_decision_message, '')), ''), decided_by_clerk_id = btrim(p_actor_clerk_id), decided_at = now(), updated_at = now() where id = p_request_id and event_id = p_event_id returning * into v_request;
  insert into public.spogomi_team_join_request_events(request_id, event_id, status, actor_kind, actor_clerk_id, details) values (v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id), jsonb_build_object('request_kind', v_request.request_kind, 'division_id', v_request.division_id, 'matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null));
  return to_jsonb(v_request);
end;
$$;

revoke all on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) to service_role;
