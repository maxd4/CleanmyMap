-- PURPOSE: invalidate association review after a material geographic, route,
-- territory or formalities change, and reject approval without current
-- qualification evidence.
-- CALLER: the existing actions trigger and the service-only review RPC.
-- AUTHORIZATION_BOUNDARY: no public role gains review-column or RPC access;
-- the existing controlled transition setting remains the only admin bypass.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the existing trigger/RPC identity;
-- retrying a decision keeps the existing operation_id audit semantics.
-- ATOMICITY: review invalidation is part of the action update; approval and
-- its audit remain in the existing locked RPC transaction.
-- FAILURE_BEHAVIOR: a material edit returns the action to draft and clears
-- publication; approval returns a non-success result when persisted
-- formalities evidence is absent or stale.
-- SEARCH_PATH: helper and RPC functions pin pg_catalog/public explicitly.
-- GRANTS: helper functions remain server-internal; existing RPC grants stay
-- service_role-only.

create or replace function public.association_action_review_material_preparation(
  p_preparation_data jsonb
)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'actionTitle', p_preparation_data -> 'actionTitle',
    'communeZoneLabel', p_preparation_data -> 'communeZoneLabel',
    'pointDeRendezVous', p_preparation_data -> 'pointDeRendezVous',
    'zoneCiblePrevue', p_preparation_data -> 'zoneCiblePrevue',
    'plannedObjective', p_preparation_data -> 'plannedObjective',
    'placeType', p_preparation_data -> 'placeType',
    'actionContextSelection', p_preparation_data -> 'actionContextSelection',
    'routeTopology', p_preparation_data -> 'routeTopology',
    'geometryMethod', p_preparation_data -> 'geometryMethod',
    'routeTargetDistanceKm', p_preparation_data -> 'routeTargetDistanceKm',
    'routeTargetDistanceSource', p_preparation_data -> 'routeTargetDistanceSource',
    'routeObservedDistanceKm', p_preparation_data -> 'routeObservedDistanceKm',
    'midRouteLocationLabel', p_preparation_data -> 'midRouteLocationLabel',
    'midRouteCoordinates', p_preparation_data -> 'midRouteCoordinates',
    'arrivalCoordinates', p_preparation_data -> 'arrivalCoordinates',
    'routeCalibrationContext', p_preparation_data -> 'routeCalibrationContext',
    'operationalRoute', p_preparation_data -> 'operationalRoute',
    'actualRoute', p_preparation_data -> 'actualRoute',
    'routeGeometryMode', p_preparation_data -> 'routeGeometryMode',
    'routeGeometryProvider', p_preparation_data -> 'routeGeometryProvider',
    'formalitiesContext', p_preparation_data -> 'formalitiesContext',
    'formalitiesWorkflow', p_preparation_data -> 'formalitiesWorkflow',
    'gpxImport', p_preparation_data -> 'gpxImport',
    'observedCoverage', p_preparation_data -> 'observedCoverage'
  );
$$;

revoke all on function public.association_action_review_material_preparation(jsonb)
  from public, anon, authenticated;
grant execute on function public.association_action_review_material_preparation(jsonb)
  to service_role;

create or replace function public.is_association_action_formalities_ready(
  p_preparation_data jsonb
)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  with workflow as (
    select p_preparation_data -> 'formalitiesWorkflow' as value
  ),
  required_formalities as (
    select item ->> 'id' as formality_id
    from workflow,
      jsonb_array_elements(case
        when jsonb_typeof(value -> 'trace' -> 'formalities') = 'array'
          then value -> 'trace' -> 'formalities'
        else '[]'::jsonb
      end) item
    where item ->> 'requirementStatus' = 'required'
  )
  select
    jsonb_typeof((select value from workflow)) = 'object'
    and (select value ->> 'schemaVersion' from workflow) = 'action-formalities-workflow-v1'
    and jsonb_typeof((select value -> 'trace' -> 'formalities' from workflow)) = 'array'
    and jsonb_typeof((select value -> 'progress' from workflow)) = 'array'
    and not exists (
      select 1
      from required_formalities required
      where required.formality_id is null
         or not exists (
           select 1
           from workflow,
             jsonb_array_elements(value -> 'progress') progress
           where progress ->> 'formalityId' = required.formality_id
             and progress ->> 'userStatus' = 'sent'
             and progress ->> 'active' = 'true'
             and progress ->> 'validForQualification' = 'true'
         )
    );
$$;

revoke all on function public.is_association_action_formalities_ready(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_association_action_formalities_ready(jsonb)
  to service_role;

create or replace function public.enforce_association_action_review_contract()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_required boolean := public.is_association_action_review_required(new.organizer_type, new.action_phase);
  v_transition boolean := current_setting('cleanmymap.association_review_transition', true) = 'on';
  v_material_change boolean := false;
begin
  if v_required then
    if tg_op = 'INSERT' then
      new.review_state := 'draft';
      new.published_at := null;
      new.review_submitted_at := null;
      new.review_decided_at := null;
      new.review_decided_by_clerk_id := null;
      new.review_reason := null;
      new.review_operation_id := null;
    else
      v_material_change :=
        old.organizer_type is distinct from new.organizer_type
        or old.organizer_id is distinct from new.organizer_id
        or old.organizer_name is distinct from new.organizer_name
        or old.action_date is distinct from new.action_date
        or old.event_start_time is distinct from new.event_start_time
        or old.event_end_time is distinct from new.event_end_time
        or old.location_label is distinct from new.location_label
        or old.latitude is distinct from new.latitude
        or old.longitude is distinct from new.longitude
        or old.department_code is distinct from new.department_code
        or old.department_name is distinct from new.department_name
        or old.derived_geometry_kind is distinct from new.derived_geometry_kind
        or old.derived_geometry_geojson is distinct from new.derived_geometry_geojson
        or old.geometry_source is distinct from new.geometry_source
        or public.association_action_review_material_preparation(old.preparation_data)
          is distinct from public.association_action_review_material_preparation(new.preparation_data)
        or old.notes is distinct from new.notes;

      if not v_transition and v_material_change then
        new.review_state := 'draft';
        new.published_at := null;
        new.review_submitted_at := null;
        new.review_decided_at := null;
        new.review_decided_by_clerk_id := null;
        new.review_reason := null;
        new.review_operation_id := null;
      end if;

      if not v_transition and new.review_state not in ('draft', 'pending_review', 'rejected', 'approved') then
        new.review_state := 'draft';
      end if;
      if not v_transition and new.review_state <> 'approved' and new.published_at is not null then
        raise exception 'association_action_review_required';
      end if;
    end if;
  else
    new.review_state := 'not_required';
    new.review_submitted_at := null;
    new.review_decided_at := null;
    new.review_decided_by_clerk_id := null;
    new.review_reason := null;
    new.review_operation_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_association_action_review_contract on public.actions;
create trigger trg_association_action_review_contract
before insert or update on public.actions
for each row execute function public.enforce_association_action_review_contract();

create or replace function public.decide_association_action_review(
  p_action_id uuid,
  p_decision text,
  p_actor_user_id text,
  p_operation_id text,
  p_reason text,
  p_expected_review_state text default 'pending_review',
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_existing public.admin_operations_audit%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_reason text := nullif(btrim(p_reason), '');
  v_next_state text;
  v_published_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if v_actor is null or v_operation is null or v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500 then raise exception 'Invalid association review decision'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid association review decision'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_operation, 0));
  select * into v_existing from public.admin_operations_audit where operation_id = v_operation for update;
  if found then
    select * into v_action from public.actions where id = p_action_id;
    return jsonb_build_object('status', 'unchanged', 'review_state', v_action.review_state, 'published_at', v_action.published_at, 'idempotent', true);
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_action_id::text,
      jsonb_build_object('operation', case when p_decision = 'approve' then 'association_action_publish_approved' else 'association_action_publish_rejected' end, 'reason', v_reason, 'stage', 'lookup'));
    return jsonb_build_object('status', 'not_found');
  end if;
  if not public.is_association_action_review_required(v_action.organizer_type, v_action.action_phase) then
    raise exception 'association_action_review_not_required';
  end if;
  if v_action.review_state is distinct from p_expected_review_state
     or (p_expected_updated_at is not null and v_action.updated_at is distinct from p_expected_updated_at) then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_action_id::text, v_action.created_by_clerk_id,
      jsonb_build_object('operation', case when p_decision = 'approve' then 'association_action_publish_approved' else 'association_action_publish_rejected' end, 'reason', v_reason, 'oldReviewState', v_action.review_state, 'newReviewState', p_decision, 'conflict', true, 'stage', 'concurrency'));
    return jsonb_build_object('status', 'conflict', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
  end if;
  if p_decision = 'approve' and (nullif(btrim(v_action.location_label), '') is null or v_action.action_date is null or nullif(btrim(coalesce(v_action.organizer_name, '')), '') is null) then
    raise exception 'association_action_content_incomplete';
  end if;
  if p_decision = 'approve' and not public.is_association_action_formalities_ready(v_action.preparation_data) then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_action_id::text, v_action.created_by_clerk_id,
      jsonb_build_object('operation', 'association_action_publish_approved', 'reason', v_reason, 'stage', 'formalities', 'formalitiesReady', false));
    return jsonb_build_object('status', 'formalities_not_ready', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
  end if;

  v_next_state := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  v_published_at := case when p_decision = 'approve' then now() else null end;
  perform set_config('cleanmymap.association_review_transition', 'on', true);
  update public.actions
  set review_state = v_next_state,
      review_decided_at = now(),
      review_decided_by_clerk_id = v_actor,
      review_reason = v_reason,
      review_operation_id = v_operation,
      published_at = v_published_at
  where id = p_action_id;

  insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
  values (v_operation, v_actor, 'admin_operation', 'success', p_action_id::text, v_action.created_by_clerk_id,
    jsonb_build_object('operation', case when p_decision = 'approve' then 'association_action_publish_approved' else 'association_action_publish_rejected' end, 'oldReviewState', v_action.review_state, 'newReviewState', v_next_state, 'reason', v_reason, 'operationId', v_operation, 'result', 'persisted'));

  insert into public.app_notifications (user_id, type, title, content, payload)
  select distinct ao.user_id,
    'validation',
    case when p_decision = 'approve' then 'Action associative validée' else 'Action associative à corriger' end,
    case when p_decision = 'approve' then 'Votre action associative a été validée et publiée.' else 'Votre action associative a été refusée ; consultez le motif puis soumettez-la à nouveau.' end,
    jsonb_build_object(
      'eventType', 'association_action_review',
      'eventKey', 'association_action_review:' || p_action_id::text || ':' || v_operation,
      'actionId', p_action_id,
      'reviewState', v_next_state,
      'reason', v_reason,
      'href', '/actions/new?actionId=' || p_action_id::text
    )
  from (
    select v_action.created_by_clerk_id as user_id
    union all
    select organizer_clerk_id from public.action_organizers where action_id = p_action_id
  ) ao
  where nullif(btrim(ao.user_id), '') is not null
  on conflict do nothing;

  select * into v_action from public.actions where id = p_action_id;
  return jsonb_build_object('status', 'updated', 'review_state', v_action.review_state, 'published_at', v_action.published_at, 'updated_at', v_action.updated_at);
end;
$$;

revoke all on function public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz) to service_role;
