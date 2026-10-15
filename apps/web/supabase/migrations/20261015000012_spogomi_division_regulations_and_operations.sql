-- SPOGOMI: division-owned regulations and explicit division operations.
--
-- The parent edition and its single environmental action remain unchanged. This
-- migration gives each stable division its own regulation snapshot and adds
-- service-only entry points that require the division on every sports write.
-- Existing single-division RPCs remain available for historical compatibility.

alter table public.spogomi_divisions
  add column if not exists regulation_version text,
  add column if not exists regulation_status text,
  add column if not exists regulation_source_reference text,
  add column if not exists regulation_config jsonb,
  add column if not exists team_size_config jsonb;

update public.spogomi_divisions division
   set regulation_version = event.regulation_version,
       regulation_status = event.regulation_status,
       regulation_source_reference = event.regulation_source_reference,
       regulation_config = event.regulation_config,
       team_size_config = event.team_size_config
  from public.spogomi_events event
 where event.id = division.event_id
   and event.mode <> 'mixed'
   and division.regulation_version is null;

update public.spogomi_divisions
   set regulation_version = 'pending',
       regulation_status = 'incomplete',
       regulation_config = '{}'::jsonb,
       team_size_config = '{}'::jsonb
 where regulation_version is null;

alter table public.spogomi_divisions
  alter column regulation_version set not null,
  alter column regulation_status set not null,
  alter column regulation_config set not null,
  alter column team_size_config set not null;

alter table public.spogomi_divisions
  add constraint spogomi_divisions_regulation_status_check
  check (regulation_status in ('incomplete', 'complete')),
  add constraint spogomi_divisions_regulation_version_check
  check (length(btrim(regulation_version)) > 0);

create index if not exists spogomi_divisions_event_regulation_idx
  on public.spogomi_divisions(event_id, regulation_status, regulation_version);

create or replace function public.spogomi_division_regulation_is_complete(
  p_event_id uuid,
  p_division_id uuid,
  p_regulation_version text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with division_config as (
    select d.*
      from public.spogomi_divisions d
     where d.id = p_division_id
       and d.event_id = p_event_id
       and d.regulation_version = p_regulation_version
       and d.regulation_status = 'complete'
  ), categories as (
    select c.*
      from public.spogomi_category_rules c
     where c.event_id = p_event_id
       and c.division_id = p_division_id
  ), config as (
    select d.regulation_config
      from division_config d
  )
  select exists (select 1 from division_config)
     and exists (select 1 from categories)
     and not exists (
       select 1 from categories c
        where c.regulation_version <> p_regulation_version
           or length(btrim(c.code)) = 0
           or length(btrim(c.label)) = 0
           or length(btrim(c.unit)) = 0
           or c.is_complete = false
           or (c.coefficient_status = 'confirmed' and c.coefficient is null)
     )
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'rounding') = 'object'
          and jsonb_typeof(c.regulation_config #> '{rounding,decimals}') = 'number'
          and (c.regulation_config #>> '{rounding,mode}') in ('half_up', 'down', 'up')
         from config c
     ), false)
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'eligibility') = 'object'
          and jsonb_typeof(c.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean'
         from config c
     ), false)
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'tiebreakers') = 'array'
          and jsonb_array_length(c.regulation_config -> 'tiebreakers') > 0
         from config c
     ), false);
$$;

create or replace function public.spogomi_update_division_regulation(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_regulation_version text,
  p_regulation_status text,
  p_regulation_source_reference text,
  p_regulation_config jsonb,
  p_team_size_config jsonb
)
returns public.spogomi_divisions
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null or p_division_id is null
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or length(btrim(coalesce(p_regulation_version, ''))) = 0
     or p_regulation_status not in ('incomplete', 'complete')
     or jsonb_typeof(coalesce(p_regulation_config, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_team_size_config, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '42501', message = 'SPOGOMI division regulation update is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'The SPOGOMI preparation revision changed';
  end if;
  select * into v_division from public.spogomi_divisions
   where id = p_division_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI division not found'; end if;
  update public.spogomi_divisions
     set regulation_version = btrim(p_regulation_version),
         regulation_status = p_regulation_status,
         regulation_source_reference = nullif(btrim(coalesce(p_regulation_source_reference, '')), ''),
         regulation_config = p_regulation_config,
         team_size_config = p_team_size_config,
         updated_at = now()
   where id = p_division_id
   returning * into v_division;
  return v_division;
end;
$$;

revoke all on function public.spogomi_division_regulation_is_complete(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.spogomi_update_division_regulation(uuid, uuid, bigint, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_update_division_regulation(uuid, uuid, bigint, text, text, text, text, jsonb, jsonb) to service_role;

-- Explicit composition boundary. The historical function still owns the
-- mutation algorithm; this wrapper prevents a mixed edition from receiving an
-- ambiguous proposal and checks the division-owned Casual bounds first.
create or replace function public.spogomi_confirm_team_composition_for_division(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_assignments jsonb,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_min integer;
  v_max integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = '42501', message = 'SPOGOMI composition is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI division not found'; end if;
  if exists (select 1 from jsonb_array_elements(p_assignments) item where (item ->> 'divisionId')::uuid is distinct from p_division_id) then
    raise exception using errcode = '22023', message = 'Every composition assignment must carry the selected divisionId';
  end if;
  v_min := nullif(v_division.team_size_config #>> '{casual,minMembers}', '')::integer;
  v_max := nullif(v_division.team_size_config #>> '{casual,maxMembers}', '')::integer;
  if v_division.division_type = 'casual' and exists (
    select 1 from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null
     group by (item ->> 'teamNumber')::integer
     having (v_min is not null and count(*) < v_min) or (v_max is not null and count(*) > v_max)
  ) then
    raise exception using errcode = '23514', message = 'A Casual team is outside its division regulation bounds';
  end if;
  perform set_config('spogomi.explicit_division_id', p_division_id::text, true);
  return public.spogomi_confirm_team_composition(p_event_id, p_expected_revision, p_assignments, p_actor_clerk_id);
end;
$$;

create or replace function public.spogomi_move_participant_to_team_for_division(
  p_event_id uuid,
  p_division_id uuid,
  p_participant_id uuid,
  p_team_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id)
     or not exists (select 1 from public.spogomi_participants where id = p_participant_id and event_id = p_event_id and division_id = p_division_id)
     or (p_team_id is not null and not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id)) then
    raise exception using errcode = '42501', message = 'SPOGOMI participant and team must belong to the selected division';
  end if;
  return public.spogomi_move_participant_to_team(p_event_id, p_participant_id, p_team_id, p_expected_revision, p_actor_clerk_id);
end;
$$;

revoke all on function public.spogomi_confirm_team_composition_for_division(uuid, uuid, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.spogomi_move_participant_to_team_for_division(uuid, uuid, uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition_for_division(uuid, uuid, bigint, jsonb, text) to service_role;
grant execute on function public.spogomi_move_participant_to_team_for_division(uuid, uuid, uuid, uuid, bigint, text) to service_role;

-- Result submission RPC with an explicit division. It mirrors the historical
-- idempotent protocol but never relies on the legacy single-division trigger.
create or replace function public.spogomi_save_team_submission_for_division(
  p_event_id uuid, p_division_id uuid, p_team_id uuid, p_submission_id uuid,
  p_idempotency_key text, p_status text, p_regulation_version text,
  p_replaces_submission_id uuid, p_correction_reason text, p_items jsonb,
  p_actor_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_submission public.spogomi_result_submissions%rowtype;
  v_existing public.spogomi_result_submissions%rowtype;
  v_version integer;
  v_action text;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_status not in ('draft', 'submitted')
     or p_actor_kind <> 'team_session' or jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id)
     or not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id) then
    raise exception using errcode = '42501', message = 'SPOGOMI team submission division is forbidden';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) item where not exists (
    select 1 from public.spogomi_category_rules category
     where category.id = (item ->> 'category_rule_id')::uuid and category.event_id = p_event_id and category.division_id = p_division_id
  )) then
    raise exception using errcode = '23514', message = 'Every submission category must belong to the selected division';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));
  if p_idempotency_key is not null then
    select * into v_existing from public.spogomi_result_submissions where team_id = p_team_id and division_id = p_division_id and idempotency_key = p_idempotency_key;
    if found then return jsonb_build_object('submission', to_jsonb(v_existing), 'already_processed', true); end if;
  end if;
  if p_submission_id is not null then
    select * into v_submission from public.spogomi_result_submissions where id = p_submission_id and event_id = p_event_id and team_id = p_team_id and division_id = p_division_id for update;
    if not found or v_submission.status <> 'draft' then raise exception using errcode = '40001', message = 'Only the current draft in this division can be edited'; end if;
    delete from public.spogomi_result_items where submission_id = v_submission.id and event_id = p_event_id and division_id = p_division_id;
    update public.spogomi_result_submissions set status = 'draft', idempotency_key = coalesce(p_idempotency_key, idempotency_key), regulation_version = p_regulation_version, correction_reason = p_correction_reason, updated_at = now() where id = v_submission.id returning * into v_submission;
  else
    select * into v_submission from public.spogomi_result_submissions where team_id = p_team_id and division_id = p_division_id and status = 'draft' order by version desc limit 1 for update;
    if found then
      delete from public.spogomi_result_items where submission_id = v_submission.id and event_id = p_event_id and division_id = p_division_id;
      update public.spogomi_result_submissions set idempotency_key = coalesce(p_idempotency_key, idempotency_key), regulation_version = p_regulation_version, updated_at = now() where id = v_submission.id returning * into v_submission;
    else
      select coalesce(max(version), 0) + 1 into v_version from public.spogomi_result_submissions where team_id = p_team_id and division_id = p_division_id;
      insert into public.spogomi_result_submissions (event_id, division_id, team_id, version, status, regulation_version, replaces_submission_id, correction_reason, idempotency_key)
      values (p_event_id, p_division_id, p_team_id, v_version, 'draft', p_regulation_version, p_replaces_submission_id, p_correction_reason, p_idempotency_key)
      returning * into v_submission;
    end if;
  end if;
  insert into public.spogomi_result_items (event_id, division_id, submission_id, category_rule_id, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, arbitration_comment, source_reference)
  select p_event_id, p_division_id, v_submission.id, item.category_rule_id, item.measurement_kind, item.unit, item.quantity, item.mass_grams, item.object_count, item.measurement_method, item.provenance, item.arbitration_comment, item.source_reference
    from jsonb_to_recordset(p_items) as item(category_rule_id uuid, measurement_kind text, unit text, quantity numeric, mass_grams numeric, object_count numeric, measurement_method text, provenance text, arbitration_comment text, source_reference text);
  if p_status = 'submitted' then
    update public.spogomi_result_submissions set status = 'submitted', submitted_at = now(), submitted_by_clerk_id = coalesce(submitted_by_clerk_id, current_setting('request.jwt.claim.sub', true)) where id = v_submission.id returning * into v_submission;
    v_action := case when v_submission.replaces_submission_id is null then 'submitted' else 'corrected' end;
  else
    v_action := 'draft_saved';
  end if;
  insert into public.spogomi_result_audit_events (event_id, division_id, team_id, submission_id, action, actor_kind, details)
  values (p_event_id, p_division_id, p_team_id, v_submission.id, v_action, p_actor_kind, jsonb_build_object('version', v_submission.version, 'status', v_submission.status));
  return jsonb_build_object('submission', to_jsonb(v_submission), 'already_processed', false);
end;
$$;

create or replace function public.spogomi_review_team_submission_for_division(
  p_event_id uuid, p_division_id uuid, p_team_id uuid, p_submission_id uuid,
  p_decision text, p_reviewer_clerk_id text, p_reason text, p_actor_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_submission public.spogomi_result_submissions%rowtype;
  v_previous_certified uuid;
  v_division public.spogomi_divisions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_decision not in ('certified', 'rejected') or p_actor_kind not in ('organizer', 'referee')
     or not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id)
     or not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id) then
    raise exception using errcode = '42501', message = 'SPOGOMI review division is forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id for update;
  select * into v_submission from public.spogomi_result_submissions where id = p_submission_id and event_id = p_event_id and team_id = p_team_id and division_id = p_division_id for update;
  if not found or v_submission.status <> 'submitted' then raise exception using errcode = '40001', message = 'Submission is no longer awaiting review'; end if;
  if p_decision = 'certified' then
    if not public.spogomi_division_regulation_is_complete(p_event_id, p_division_id, v_division.regulation_version) or v_submission.regulation_version <> v_division.regulation_version then
      raise exception using errcode = '23514', message = 'A complete matching division regulation is required for certification';
    end if;
    if exists (select 1 from public.spogomi_category_rules c where c.event_id = p_event_id and c.division_id = p_division_id and (c.is_complete = false or not exists (select 1 from public.spogomi_result_items i where i.submission_id = v_submission.id and i.division_id = p_division_id and i.category_rule_id = c.id and i.quantity is not null and length(btrim(i.provenance)) > 0 and length(btrim(coalesce(i.measurement_method, ''))) > 0))) then
      raise exception using errcode = '23514', message = 'Every complete category in the division must have a measured item';
    end if;
    select certified_submission_id into v_previous_certified from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id for update;
    update public.spogomi_result_submissions set status = 'certified', certified_by_clerk_id = p_reviewer_clerk_id, certified_at = now() where id = v_submission.id;
    update public.spogomi_teams set certified_submission_id = v_submission.id, updated_at = now() where id = p_team_id and event_id = p_event_id and division_id = p_division_id;
    if v_previous_certified is not null and v_previous_certified <> v_submission.id then update public.spogomi_result_submissions set status = 'superseded', updated_at = now() where id = v_previous_certified and division_id = p_division_id and status = 'certified'; end if;
  else
    update public.spogomi_result_submissions set status = 'rejected', updated_at = now() where id = v_submission.id;
  end if;
  insert into public.spogomi_result_reviews (event_id, division_id, submission_id, decision, reviewer_clerk_id, reason, replaces_submission_id)
  values (p_event_id, p_division_id, v_submission.id, p_decision, p_reviewer_clerk_id, p_reason, v_previous_certified);
  insert into public.spogomi_result_audit_events (event_id, division_id, team_id, submission_id, action, actor_kind, actor_clerk_id, details)
  values (p_event_id, p_division_id, p_team_id, v_submission.id, p_decision, p_actor_kind, p_reviewer_clerk_id, jsonb_build_object('divisionId', p_division_id, 'reason', p_reason));
  select * into v_submission from public.spogomi_result_submissions where id = p_submission_id;
  return jsonb_build_object('submission', to_jsonb(v_submission), 'decision', p_decision, 'divisionId', p_division_id);
end;
$$;

revoke all on function public.spogomi_save_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.spogomi_review_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_save_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, uuid, text, jsonb, text) to service_role;
grant execute on function public.spogomi_review_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, text) to service_role;

-- Recognition keeps one parent award projection, while attestations carry the
-- division provenance and can never cross a participant's assigned division.
create or replace function public.set_spogomi_recognition_attestation_for_division(
  p_event_id uuid, p_division_id uuid, p_participant_id uuid, p_kind text,
  p_status text, p_evidence_reference text, p_certification_version text,
  p_actor_clerk_id text, p_reason text
)
returns public.spogomi_recognition_attestations
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_participant public.spogomi_participants%rowtype;
  v_result public.spogomi_recognition_attestations%rowtype;
  v_existing public.spogomi_recognition_attestations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_kind not in ('collector', 'referee', 'organizer') or p_status not in ('certified', 'revoked') or length(btrim(coalesce(p_evidence_reference, ''))) = 0 or length(btrim(coalesce(p_certification_version, ''))) = 0 then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI division attestation';
  end if;
  select * into v_participant from public.spogomi_participants where id = p_participant_id and event_id = p_event_id and division_id = p_division_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI participant is not in the selected division'; end if;
  if v_participant.clerk_id is not null and v_participant.clerk_id = p_actor_clerk_id then raise exception using errcode = '42501', message = 'SPOGOMI self-attestation is forbidden'; end if;
  select * into v_existing from public.spogomi_recognition_attestations where event_id = p_event_id and participant_id = p_participant_id and division_id = p_division_id and kind = p_kind for update;
  if found then
    update public.spogomi_recognition_attestations set status = p_status, evidence_reference = btrim(p_evidence_reference), certified_by_clerk_id = p_actor_clerk_id, certified_at = coalesce(v_existing.certified_at, now()), certification_version = btrim(p_certification_version), revoked_at = case when p_status = 'revoked' then now() else null end, revoked_by_clerk_id = case when p_status = 'revoked' then p_actor_clerk_id else null end, revocation_reason = case when p_status = 'revoked' then nullif(btrim(coalesce(p_reason, '')), '') else null end, updated_at = now() where id = v_existing.id returning * into v_result;
  else
    if p_status = 'revoked' then raise exception using errcode = '23514', message = 'A recognition proof must be certified before revocation'; end if;
    insert into public.spogomi_recognition_attestations (event_id, division_id, participant_id, kind, status, evidence_reference, certified_by_clerk_id, certified_at, certification_version)
    values (p_event_id, p_division_id, p_participant_id, p_kind, p_status, btrim(p_evidence_reference), p_actor_clerk_id, now(), btrim(p_certification_version)) returning * into v_result;
  end if;
  insert into public.spogomi_recognition_attestation_history (attestation_id, event_id, division_id, participant_id, kind, status, action, evidence_reference, certification_version, actor_clerk_id, reason)
  values (v_result.id, p_event_id, p_division_id, p_participant_id, p_kind, p_status, case when p_status = 'revoked' then 'revoked' when v_existing.id is null then 'certified' else 'corrected' end, v_result.evidence_reference, v_result.certification_version, p_actor_clerk_id, nullif(btrim(coalesce(p_reason, '')), ''));
  return v_result;
end;
$$;

revoke all on function public.set_spogomi_recognition_attestation_for_division(uuid, uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_spogomi_recognition_attestation_for_division(uuid, uuid, uuid, text, text, text, text, text, text) to service_role;

-- Official rankings are published per division. The source snapshot is still
-- the full parent snapshot, so a retry cannot silently bind a ranking to a
-- different division or a different source version.
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
     or jsonb_typeof(p_rankings) <> 'array' or jsonb_typeof(p_source_snapshot) <> 'object' then
    raise exception using errcode = '42501', message = 'SPOGOMI division ranking publication is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  select * into v_division from public.spogomi_divisions where id = p_division_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI division not found'; end if;
  if v_event.state <> 'certified' or not public.spogomi_division_regulation_is_complete(p_event_id, p_division_id, v_division.regulation_version) then
    raise exception using errcode = '23514', message = 'The selected SPOGOMI division is not ready for official rankings';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rankings) candidate where (candidate ->> 'divisionId')::uuid is distinct from p_division_id) then
    raise exception using errcode = '22023', message = 'Every official ranking must carry the selected divisionId';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rankings) candidate group by candidate ->> 'kind', candidate ->> 'teamId' having count(*) > 1) then
    raise exception using errcode = '22023', message = 'A division ranking contains a duplicate team and kind';
  end if;
  perform 1 from public.spogomi_teams where event_id = p_event_id and division_id = p_division_id for update;
  perform 1 from public.spogomi_result_submissions where event_id = p_event_id and division_id = p_division_id for update;
  perform 1 from public.spogomi_result_items where event_id = p_event_id and division_id = p_division_id for update;
  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    if (v_ranking ->> 'kind') not in ('points', 'butts') or (v_ranking ->> 'rank') !~ '^[1-9][0-9]*$'
       or jsonb_typeof(v_ranking -> 'teamEligible') <> 'boolean'
       or not exists (select 1 from public.spogomi_teams where id = (v_ranking ->> 'teamId')::uuid and event_id = p_event_id and division_id = p_division_id) then
      raise exception using errcode = '22023', message = 'Invalid SPOGOMI division official ranking';
    end if;
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
      values (p_event_id, p_division_id, (v_ranking ->> 'teamId')::uuid, v_ranking ->> 'kind', (v_ranking ->> 'rank')::integer, 'certified', (v_ranking ->> 'teamEligible')::boolean, btrim(p_decision_version), btrim(p_source_reference), p_source_snapshot, p_actor_clerk_id)
      returning * into v_existing;
    elsif v_existing.source_snapshot is distinct from p_source_snapshot or v_existing.rank <> (v_ranking ->> 'rank')::integer then
      raise exception using errcode = '40001', message = 'The SPOGOMI division ranking decision version is already bound to another source';
    elsif v_existing.status = 'revoked' then
      update public.spogomi_official_rankings set status = 'certified', updated_at = now() where id = v_existing.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.publish_spogomi_official_rankings_for_division(uuid, uuid, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_spogomi_official_rankings_for_division(uuid, uuid, text, text, jsonb, text, jsonb) to service_role;

comment on table public.spogomi_divisions is
  'Canonical typed divisions. Regulation and team composition bounds belong to this row; the parent keeps one environmental action.';
comment on function public.spogomi_save_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, uuid, text, jsonb, text) is
  'Atomic idempotent team submission with an explicit division scope.';
comment on function public.spogomi_review_team_submission_for_division(uuid, uuid, uuid, uuid, text, text, text, text) is
  'Atomic certification decision with division-scoped regulation and source rows.';

-- Volunteer certificates are one parent-level personal projection. Their
-- missions retain division provenance in the source snapshot, but a mixed
-- edition must not manufacture one certificate per division.
alter table public.spogomi_volunteer_certificates
  alter column division_id drop not null;
alter table public.spogomi_volunteer_certificate_history
  alter column division_id drop not null;
drop trigger if exists spogomi_volunteer_certificates_fill_single_division on public.spogomi_volunteer_certificates;
drop trigger if exists spogomi_volunteer_certificate_history_fill_single_division on public.spogomi_volunteer_certificate_history;

create or replace function public.issue_spogomi_volunteer_certificate(
  p_user_id text,
  p_event_id uuid,
  p_source_fingerprint text,
  p_source_snapshot jsonb,
  p_actor_clerk_id text
)
returns public.spogomi_volunteer_certificates
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_current public.spogomi_volunteer_certificates%rowtype;
  v_result public.spogomi_volunteer_certificates%rowtype;
  v_division_id uuid;
  v_division_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_user_id, ''))) = 0
     or p_event_id is null or p_source_snapshot is null
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or length(btrim(coalesce(p_source_fingerprint, ''))) <> 64
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI certificate issuance is forbidden';
  end if;
  select count(*)::integer, min(id) into v_division_count, v_division_id
    from public.spogomi_divisions where event_id = p_event_id;
  if v_division_count = 0 then
    raise exception using errcode = 'P0002', message = 'SPOGOMI divisions not found';
  end if;
  if v_division_count > 1 then v_division_id := null; end if;
  select * into v_current from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active' for update;
  if found and v_current.source_fingerprint = p_source_fingerprint then return v_current; end if;
  if found then
    update public.spogomi_volunteer_certificates
       set status = 'replaced', revoked_at = now(), revocation_reason = 'Nouvelle version de l’état certifié.', updated_at = now()
     where id = v_current.id;
    insert into public.spogomi_volunteer_certificate_history
      (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
    values (v_current.id, v_current.user_id, v_current.event_id, v_current.division_id, v_current.certificate_reference, 'replaced', 'replaced', v_current.source_fingerprint, p_actor_clerk_id, 'Nouvelle version de l’état certifié.');
  end if;
  insert into public.spogomi_volunteer_certificates
    (certificate_reference, user_id, event_id, division_id, source_fingerprint, source_snapshot, status)
  values ('SPOGOMI-' || upper(replace(gen_random_uuid()::text, '-', '')), p_user_id, p_event_id, v_division_id, p_source_fingerprint, p_source_snapshot, 'active')
  returning * into v_result;
  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id)
  values (v_result.id, v_result.user_id, v_result.event_id, v_result.division_id, v_result.certificate_reference, 'issued', 'active', v_result.source_fingerprint, p_actor_clerk_id);
  return v_result;
end;
$$;

create or replace function public.revoke_spogomi_volunteer_certificate(
  p_user_id text, p_event_id uuid, p_reason text, p_actor_clerk_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_current public.spogomi_volunteer_certificates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_user_id, ''))) = 0
     or p_event_id is null or length(btrim(coalesce(p_reason, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI certificate revocation is forbidden';
  end if;
  select * into v_current from public.spogomi_volunteer_certificates
   where user_id = p_user_id and event_id = p_event_id and status = 'active' for update;
  if not found then return false; end if;
  update public.spogomi_volunteer_certificates
     set status = 'revoked', revoked_at = now(), revocation_reason = p_reason, updated_at = now()
   where id = v_current.id;
  insert into public.spogomi_volunteer_certificate_history
    (certificate_id, user_id, event_id, division_id, certificate_reference, action, status, source_fingerprint, actor_clerk_id, reason)
  values (v_current.id, v_current.user_id, v_current.event_id, v_current.division_id, v_current.certificate_reference, 'revoked', 'revoked', v_current.source_fingerprint, p_actor_clerk_id, p_reason);
  return true;
end;
$$;

revoke all on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.issue_spogomi_volunteer_certificate(text, uuid, text, jsonb, text) to service_role;
revoke all on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.revoke_spogomi_volunteer_certificate(text, uuid, text, text) to service_role;

-- Collection awards remain unique by user, event and badge. The explicit
-- division on each desired proof prevents a mixed edition from falling back
-- to the first division while preserving one parent-level award instance.
create or replace function public.reconcile_spogomi_collection_awards_for_divisions(
  p_event_id uuid,
  p_awards jsonb,
  p_actor_clerk_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_award jsonb;
  v_existing public.spogomi_collection_awards%rowtype;
  v_event_date date;
  v_event_year integer;
  v_touched integer := 0;
  v_action text;
  v_division_id uuid;
  v_division_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or p_event_id is null or p_awards is null
     or jsonb_typeof(p_awards) <> 'array' or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI recognition reconciliation is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  v_event_date := (v_event.starts_at at time zone v_event.official_timezone)::date;
  v_event_year := extract(year from (v_event.starts_at at time zone v_event.official_timezone))::integer;
  select count(*)::integer into v_division_count from public.spogomi_divisions where event_id = p_event_id;
  for v_award in select value from jsonb_array_elements(p_awards) loop
    if length(btrim(coalesce(v_award ->> 'userId', ''))) = 0 or length(btrim(coalesce(v_award ->> 'badgeTypeId', ''))) = 0
       or length(btrim(coalesce(v_award ->> 'proofReference', ''))) = 0 or length(btrim(coalesce(v_award ->> 'certificationReference', ''))) = 0 then
      raise exception using errcode = '22023', message = 'Invalid SPOGOMI award proof';
    end if;
    v_division_id := nullif(v_award ->> 'divisionId', '')::uuid;
    if v_division_id is null and v_division_count = 1 then select min(id) into v_division_id from public.spogomi_divisions where event_id = p_event_id; end if;
    if v_division_count <> 1 and v_division_id is null then raise exception using errcode = '22023', message = 'A mixed SPOGOMI award requires an explicit divisionId'; end if;
    if not exists (select 1 from public.spogomi_divisions where id = v_division_id and event_id = p_event_id) then raise exception using errcode = '22023', message = 'The SPOGOMI award division is invalid'; end if;
    select * into v_existing from public.spogomi_collection_awards where user_id = v_award ->> 'userId' and event_id = p_event_id and badge_type_id = v_award ->> 'badgeTypeId' for update;
    if found then
      if v_existing.division_id is distinct from v_division_id then raise exception using errcode = '40001', message = 'A SPOGOMI award cannot change division without a new proof'; end if;
      if v_existing.status <> 'active' or v_existing.proof_reference is distinct from v_award ->> 'proofReference' or v_existing.certification_reference is distinct from v_award ->> 'certificationReference' or v_existing.ranking_version is distinct from nullif(v_award ->> 'rankingVersion', '') then
        v_action := case when v_existing.status <> 'active' then 'reinstated' else 'corrected' end;
        update public.spogomi_collection_awards set event_year = v_event_year, event_local_date = v_event_date, event_timezone = v_event.official_timezone, proof_reference = v_award ->> 'proofReference', certification_reference = v_award ->> 'certificationReference', ranking_version = nullif(v_award ->> 'rankingVersion', ''), status = 'active', updated_at = now() where id = v_existing.id;
        insert into public.spogomi_collection_award_history (award_id, user_id, event_id, division_id, badge_type_id, action, status, proof_reference, actor_clerk_id) values (v_existing.id, v_award ->> 'userId', p_event_id, v_division_id, v_award ->> 'badgeTypeId', v_action, 'active', v_award ->> 'proofReference', p_actor_clerk_id);
        v_touched := v_touched + 1;
      end if;
    else
      insert into public.spogomi_collection_awards (user_id, event_id, division_id, badge_type_id, event_year, event_local_date, event_timezone, proof_reference, certification_reference, ranking_version, status) values (v_award ->> 'userId', p_event_id, v_division_id, v_award ->> 'badgeTypeId', v_event_year, v_event_date, v_event.official_timezone, v_award ->> 'proofReference', v_award ->> 'certificationReference', nullif(v_award ->> 'rankingVersion', ''), 'active') returning * into v_existing;
      insert into public.spogomi_collection_award_history (award_id, user_id, event_id, division_id, badge_type_id, action, status, proof_reference, actor_clerk_id) values (v_existing.id, v_existing.user_id, v_existing.event_id, v_existing.division_id, v_existing.badge_type_id, 'awarded', 'active', v_existing.proof_reference, p_actor_clerk_id);
      v_touched := v_touched + 1;
    end if;
  end loop;
  for v_existing in select * from public.spogomi_collection_awards where event_id = p_event_id and status = 'active' for update loop
    if not exists (select 1 from jsonb_array_elements(p_awards) a where a ->> 'userId' = v_existing.user_id and a ->> 'badgeTypeId' = v_existing.badge_type_id) then
      update public.spogomi_collection_awards set status = 'replaced', updated_at = now() where id = v_existing.id;
      insert into public.spogomi_collection_award_history (award_id, user_id, event_id, division_id, badge_type_id, action, status, proof_reference, actor_clerk_id, reason) values (v_existing.id, v_existing.user_id, p_event_id, v_existing.division_id, v_existing.badge_type_id, 'replaced', 'replaced', v_existing.proof_reference, p_actor_clerk_id, 'Projection SPOGOMI corrigée ou preuve révoquée.');
      v_touched := v_touched + 1;
    end if;
  end loop;
  return v_touched;
end;
$$;

revoke all on function public.reconcile_spogomi_collection_awards_for_divisions(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.reconcile_spogomi_collection_awards_for_divisions(uuid, jsonb, text) to service_role;
