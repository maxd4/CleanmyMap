-- SPOGOMI: division-scoped official ranking snapshot validation.
-- The previous forward migration introduced the explicit publication RPC; this
-- version makes its source check as strict as the historical parent RPC while
-- keeping the comparison bounded to the selected division.

create or replace function public.publish_spogomi_official_rankings_for_division(
  p_event_id uuid, p_division_id uuid, p_decision_version text,
  p_source_reference text, p_rankings jsonb, p_actor_clerk_id text,
  p_source_snapshot jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_ranking jsonb;
  v_current public.spogomi_official_rankings%rowtype;
  v_existing public.spogomi_official_rankings%rowtype;
  v_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_event_id is null or p_division_id is null
     or length(btrim(coalesce(p_decision_version, ''))) = 0
     or length(btrim(coalesce(p_source_reference, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or jsonb_typeof(p_rankings) <> 'array' or jsonb_typeof(p_source_snapshot) <> 'object'
     or jsonb_typeof(p_source_snapshot -> 'event') <> 'object'
     or jsonb_typeof(p_source_snapshot -> 'divisions') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'categories') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'teams') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'submissions') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'items') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'participants') <> 'array' then
    raise exception using errcode = '42501', message = 'SPOGOMI division ranking publication is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI division not found'; end if;
  if v_event.state <> 'certified' or not public.spogomi_division_regulation_is_complete(p_event_id, p_division_id, v_division.regulation_version) then
    raise exception using errcode = '23514', message = 'The selected SPOGOMI division is not ready for official rankings';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_source_snapshot -> 'divisions') captured(value)
     where captured.value ->> 'id' = p_division_id::text
       and captured.value ->> 'type' = v_division.division_type
       and captured.value ->> 'regulationVersion' = v_division.regulation_version
       and captured.value ->> 'regulationStatus' = v_division.regulation_status
       and captured.value ->> 'regulationSourceReference' is not distinct from v_division.regulation_source_reference
       and (captured.value -> 'regulationConfig') is not distinct from v_division.regulation_config
       and (captured.value -> 'teamSizeConfig') is not distinct from v_division.team_size_config
  ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI division regulation snapshot changed since calculation';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rankings) candidate group by candidate ->> 'kind', candidate ->> 'teamId' having count(*) > 1) then
    raise exception using errcode = '22023', message = 'A division ranking contains a duplicate team and kind';
  end if;

  perform 1 from public.spogomi_category_rules where event_id = p_event_id and division_id = p_division_id order by id for update;
  perform 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id order by id for update;
  perform 1 from public.spogomi_result_submissions where event_id = p_event_id and division_id = p_division_id order by id for update;
  perform 1 from public.spogomi_result_items where event_id = p_event_id and division_id = p_division_id order by id for update;
  perform 1 from public.spogomi_participants where event_id = p_event_id and division_id = p_division_id order by id for update;

  if (p_source_snapshot #>> '{event,id}') is distinct from v_event.id::text
     or jsonb_array_length(p_source_snapshot -> 'categories') <> (select count(*) from public.spogomi_category_rules where event_id = p_event_id and division_id = p_division_id)
     or jsonb_array_length(p_source_snapshot -> 'teams') <> (select count(*) from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id)
     or jsonb_array_length(p_source_snapshot -> 'submissions') <> (select count(*) from public.spogomi_result_submissions where event_id = p_event_id and division_id = p_division_id)
     or jsonb_array_length(p_source_snapshot -> 'items') <> (select count(*) from public.spogomi_result_items where event_id = p_event_id and division_id = p_division_id)
     or jsonb_array_length(p_source_snapshot -> 'participants') <> (select count(*) from public.spogomi_participants where event_id = p_event_id and division_id = p_division_id) then
    raise exception using errcode = '40001', message = 'The SPOGOMI division ranking source snapshot cardinality changed';
  end if;
  if exists (select 1 from public.spogomi_category_rules row_data where row_data.event_id = p_event_id and row_data.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_source_snapshot -> 'categories') captured(value) where captured.value ->> 'id' = row_data.id::text and captured.value ->> 'divisionId' = p_division_id::text and captured.value ->> 'regulationVersion' = row_data.regulation_version and captured.value ->> 'code' = row_data.code and captured.value ->> 'measurementKind' = row_data.measurement_kind and captured.value ->> 'unit' = row_data.unit and captured.value ->> 'coefficient' is not distinct from row_data.coefficient::text and captured.value ->> 'coefficientStatus' = row_data.coefficient_status and captured.value ->> 'environmentalCategorySlug' is not distinct from row_data.environmental_category_slug and (captured.value ->> 'isComplete')::boolean is not distinct from row_data.is_complete)) then raise exception using errcode = '40001', message = 'The SPOGOMI division category source snapshot changed'; end if;
  if exists (select 1 from public.spogomi_teams row_data where row_data.event_id = p_event_id and row_data.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_source_snapshot -> 'teams') captured(value) where captured.value ->> 'id' = row_data.id::text and captured.value ->> 'divisionId' = p_division_id::text and (captured.value ->> 'teamNumber')::integer = row_data.team_number and captured.value ->> 'compositionState' = row_data.composition_state and captured.value ->> 'certifiedSubmissionId' is not distinct from row_data.certified_submission_id::text)) then raise exception using errcode = '40001', message = 'The SPOGOMI division team source snapshot changed'; end if;
  if exists (select 1 from public.spogomi_result_submissions row_data where row_data.event_id = p_event_id and row_data.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_source_snapshot -> 'submissions') captured(value) where captured.value ->> 'id' = row_data.id::text and captured.value ->> 'divisionId' = p_division_id::text and captured.value ->> 'teamId' = row_data.team_id::text and (captured.value ->> 'version')::integer = row_data.version and captured.value ->> 'status' = row_data.status and nullif(captured.value ->> 'submittedAt', '')::timestamptz is not distinct from row_data.submitted_at and captured.value ->> 'regulationVersion' = row_data.regulation_version)) then raise exception using errcode = '40001', message = 'The SPOGOMI division submission source snapshot changed'; end if;
  if exists (select 1 from public.spogomi_result_items row_data where row_data.event_id = p_event_id and row_data.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_source_snapshot -> 'items') captured(value) where captured.value ->> 'id' = row_data.id::text and captured.value ->> 'divisionId' = p_division_id::text and captured.value ->> 'submissionId' = row_data.submission_id::text and captured.value ->> 'categoryRuleId' = row_data.category_rule_id::text and captured.value ->> 'measurementKind' = row_data.measurement_kind and captured.value ->> 'unit' = row_data.unit and nullif(captured.value ->> 'quantity', '')::numeric is not distinct from row_data.quantity and nullif(captured.value ->> 'massGrams', '')::numeric is not distinct from row_data.mass_grams and nullif(captured.value ->> 'objectCount', '')::numeric is not distinct from row_data.object_count and captured.value ->> 'measurementMethod' is not distinct from row_data.measurement_method and captured.value ->> 'provenance' = row_data.provenance and captured.value ->> 'sourceReference' is not distinct from row_data.source_reference)) then raise exception using errcode = '40001', message = 'The SPOGOMI division measurement source snapshot changed'; end if;
  if exists (select 1 from public.spogomi_participants row_data where row_data.event_id = p_event_id and row_data.division_id = p_division_id and not exists (select 1 from jsonb_array_elements(p_source_snapshot -> 'participants') captured(value) where captured.value ->> 'id' = row_data.id::text and captured.value ->> 'divisionId' = p_division_id::text and captured.value ->> 'teamId' is not distinct from row_data.team_id::text and captured.value ->> 'registrationStatus' = row_data.registration_status and captured.value ->> 'attendanceStatus' = row_data.attendance_status)) then raise exception using errcode = '40001', message = 'The SPOGOMI division participant source snapshot changed'; end if;
  if exists (select 1 from public.spogomi_official_rankings current_row where current_row.event_id = p_event_id and current_row.division_id = p_division_id and current_row.status = 'certified' and current_row.source_snapshot = p_source_snapshot and current_row.decision_version <> btrim(p_decision_version)) then raise exception using errcode = '40001', message = 'A different SPOGOMI division ranking decision already exists for this source snapshot'; end if;

  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    if (v_ranking ->> 'divisionId')::uuid is distinct from p_division_id or (v_ranking ->> 'kind') not in ('points', 'butts') or (v_ranking ->> 'teamId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or (v_ranking ->> 'rank') !~ '^[1-9][0-9]*$' or jsonb_typeof(v_ranking -> 'teamEligible') <> 'boolean' or not exists (select 1 from public.spogomi_teams where id = (v_ranking ->> 'teamId')::uuid and event_id = p_event_id and division_id = p_division_id) then raise exception using errcode = '22023', message = 'Invalid SPOGOMI division official ranking'; end if;
  end loop;
  for v_current in select * from public.spogomi_official_rankings where event_id = p_event_id and division_id = p_division_id and status = 'certified' for update loop
    if not exists (select 1 from jsonb_array_elements(p_rankings) desired where desired ->> 'kind' = v_current.kind and (desired ->> 'teamId')::uuid = v_current.team_id and (desired ->> 'rank')::integer = v_current.rank and (desired ->> 'teamEligible')::boolean = v_current.team_eligible) or v_current.decision_version <> btrim(p_decision_version) then
      update public.spogomi_official_rankings set status = 'revoked', updated_at = now() where id = v_current.id;
      insert into public.spogomi_official_ranking_history (ranking_id, event_id, division_id, team_id, kind, rank, status, action, team_eligible, decision_version, source_reference, source_snapshot, actor_clerk_id)
      values (v_current.id, v_current.event_id, v_current.division_id, v_current.team_id, v_current.kind, v_current.rank, 'revoked', 'revoked', v_current.team_eligible, v_current.decision_version, v_current.source_reference, v_current.source_snapshot, p_actor_clerk_id);
    end if;
  end loop;
  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    select * into v_existing from public.spogomi_official_rankings where event_id = p_event_id and division_id = p_division_id and kind = v_ranking ->> 'kind' and team_id = (v_ranking ->> 'teamId')::uuid and decision_version = btrim(p_decision_version) for update;
    if not found then
      insert into public.spogomi_official_rankings (event_id, division_id, team_id, kind, rank, status, team_eligible, decision_version, source_reference, source_snapshot, decided_by_clerk_id)
      values (p_event_id, p_division_id, (v_ranking ->> 'teamId')::uuid, v_ranking ->> 'kind', (v_ranking ->> 'rank')::integer, 'certified', (v_ranking ->> 'teamEligible')::boolean, btrim(p_decision_version), btrim(p_source_reference), p_source_snapshot, p_actor_clerk_id) returning * into v_existing;
      insert into public.spogomi_official_ranking_history (ranking_id, event_id, division_id, team_id, kind, rank, status, action, team_eligible, decision_version, source_reference, source_snapshot, actor_clerk_id)
      values (v_existing.id, v_existing.event_id, v_existing.division_id, v_existing.team_id, v_existing.kind, v_existing.rank, 'certified', 'certified', v_existing.team_eligible, v_existing.decision_version, v_existing.source_reference, v_existing.source_snapshot, p_actor_clerk_id);
    elsif v_existing.source_snapshot is distinct from p_source_snapshot or v_existing.rank <> (v_ranking ->> 'rank')::integer or v_existing.team_eligible <> (v_ranking ->> 'teamEligible')::boolean then
      raise exception using errcode = '40001', message = 'The SPOGOMI division ranking decision version is already bound to another source';
    elsif v_existing.status = 'revoked' then
      update public.spogomi_official_rankings set status = 'certified', updated_at = now() where id = v_existing.id;
      insert into public.spogomi_official_ranking_history (ranking_id, event_id, division_id, team_id, kind, rank, status, action, team_eligible, decision_version, source_reference, source_snapshot, actor_clerk_id)
      values (v_existing.id, v_existing.event_id, v_existing.division_id, v_existing.team_id, v_existing.kind, v_existing.rank, 'certified', 'reinstated', v_existing.team_eligible, v_existing.decision_version, v_existing.source_reference, v_existing.source_snapshot, p_actor_clerk_id);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.publish_spogomi_official_rankings_for_division(uuid, uuid, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_spogomi_official_rankings_for_division(uuid, uuid, text, text, jsonb, text, jsonb) to service_role;
