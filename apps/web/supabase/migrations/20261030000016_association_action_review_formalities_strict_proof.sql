-- PURPOSE: close the remaining fail-open formalities proof paths without
-- rewriting the already-applied 00012/00013 migrations.
-- CALLER: the service-only association action review decision RPC.
-- FAILURE_BEHAVIOR: absent, incomplete or malformed workflow/proof JSON is
-- never ready; the helper is strictly boolean and never returns NULL.
-- COMPATIBILITY: user_declared proofs remain sufficient and their reference
-- remains optional; non-required formalities do not block approval.
-- AUTHORIZATION_BOUNDARY: only service_role can execute the helper and RPC.
-- IDEMPOTENCY/ATOMICITY: the existing operation_id advisory lock, row lock,
-- audit and notification transaction are preserved byte-for-byte in the RPC.

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
  formalities as (
    select item
    from workflow,
      jsonb_array_elements(case
        when jsonb_typeof(value -> 'trace' -> 'formalities') = 'array'
          then value -> 'trace' -> 'formalities'
        else '[]'::jsonb
      end) item
  ),
  required_formalities as (
    select item ->> 'id' as formality_id
    from formalities
    where item ->> 'requirementStatus' = 'required'
  ),
  progress_entries as (
    select item
    from workflow,
      jsonb_array_elements(case
        when jsonb_typeof(value -> 'progress') = 'array'
          then value -> 'progress'
        else '[]'::jsonb
      end) item
  )
  select coalesce(
    jsonb_typeof(p_preparation_data) = 'object'
    and jsonb_typeof((select value from workflow)) = 'object'
    and (select value ->> 'schemaVersion' from workflow) = 'action-formalities-workflow-v1'
    and jsonb_typeof((select value -> 'contentVersion' from workflow)) = 'string'
    and jsonb_typeof((select value -> 'trace' from workflow)) = 'object'
    and jsonb_typeof((select value -> 'trace' -> 'formalities' from workflow)) = 'array'
    and jsonb_typeof((select value -> 'progress' from workflow)) = 'array'
    and not exists (
      select 1
      from formalities
      where not coalesce(
        jsonb_typeof(item) = 'object'
        and jsonb_typeof(item -> 'id') = 'string'
        and nullif(btrim(item ->> 'id'), '') is not null
        and item ->> 'requirementStatus' in ('required', 'recommended', 'not_required', 'unknown')
        and item ->> 'procedureKind' in ('city_aot', 'police_declaration', 'information_only', 'none', 'unknown')
        and item ? 'sourceId'
        and jsonb_typeof(item -> 'sourceId') in ('null', 'string'),
        false
      )
    )
    and not exists (
      select 1
      from progress_entries
      where not coalesce(
        jsonb_typeof(item) = 'object'
        and jsonb_typeof(item -> 'formalityId') = 'string'
        and nullif(btrim(item ->> 'formalityId'), '') is not null
        and item ->> 'userStatus' in ('not_started', 'prepared', 'sent')
        and jsonb_typeof(item -> 'contentVersion') = 'string'
        and item ? 'statusChangedAt'
        and jsonb_typeof(item -> 'statusChangedAt') in ('null', 'string')
        and item ? 'proof'
        and (
          jsonb_typeof(item -> 'proof') = 'null'
          or (
            jsonb_typeof(item -> 'proof') = 'object'
            and item -> 'proof' ->> 'kind' in ('user_declared', 'official_confirmation')
            and item -> 'proof' ? 'reference'
            and jsonb_typeof(item -> 'proof' -> 'reference') in ('null', 'string')
            and jsonb_typeof(item -> 'proof' -> 'recordedAt') = 'string'
            and nullif(btrim(item -> 'proof' ->> 'recordedAt'), '') is not null
          )
        )
        and jsonb_typeof(item -> 'active') = 'boolean'
        and jsonb_typeof(item -> 'validForQualification') = 'boolean'
        and item ? 'invalidatedAt'
        and jsonb_typeof(item -> 'invalidatedAt') in ('null', 'string'),
        false
      )
    )
    and not exists (
      select 1
      from required_formalities required
      where required.formality_id is null
         or not exists (
           select 1
           from progress_entries progress
           where progress.item ->> 'formalityId' = required.formality_id
             and progress.item ->> 'userStatus' = 'sent'
             and progress.item -> 'active' = 'true'::jsonb
             and progress.item -> 'validForQualification' = 'true'::jsonb
             and jsonb_typeof(progress.item -> 'proof') = 'object'
             and progress.item -> 'proof' ->> 'kind' in ('user_declared', 'official_confirmation')
             and progress.item -> 'proof' ? 'reference'
             and jsonb_typeof(progress.item -> 'proof' -> 'reference') in ('null', 'string')
             and jsonb_typeof(progress.item -> 'proof' -> 'recordedAt') = 'string'
             and nullif(btrim(progress.item -> 'proof' ->> 'recordedAt'), '') is not null
         )
    ),
    false
  );
$$;

revoke all on function public.is_association_action_formalities_ready(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_association_action_formalities_ready(jsonb)
  to service_role;

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
  if p_decision = 'approve' and public.is_association_action_formalities_ready(v_action.preparation_data) is not true then
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
    case when p_decision = 'approve' then 'Votre action associative a été validée et publiée.' else 'Votre action associative a été refusée ; consultez le motif puis corrigez et soumettez-la à nouveau.' end,
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
