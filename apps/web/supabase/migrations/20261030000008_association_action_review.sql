-- PURPOSE: require an explicit administrative review before publishing new
-- association and student-association future actions.
-- CALLERS: the authenticated owner submits through the server route; admins
-- decide through the service-role RPC behind the explicit admin boundary.
-- AUTHORIZATION_BOUNDARY: browser roles cannot update review columns or call
-- either RPC; the server route remains responsible for Clerk AuthN/AuthZ.
-- ATOMICITY: the decision, publication marker and immutable admin audit row
-- are committed together under a row lock.
-- IDEMPOTENCY: operation_id is advisory-locked and persisted on the action;
-- retrying the same decision returns the already-applied result.
-- FORWARD_ONLY: historical rows are backfilled as not_required and remain
-- publicly compatible; community_events is intentionally untouched.

alter table public.actions
  add column if not exists review_state text not null default 'not_required',
  add column if not exists review_submitted_at timestamptz,
  add column if not exists review_decided_at timestamptz,
  add column if not exists review_decided_by_clerk_id text,
  add column if not exists review_reason text,
  add column if not exists review_operation_id text;

alter table public.actions
  drop constraint if exists actions_review_state_check;
alter table public.actions
  add constraint actions_review_state_check
  check (review_state in ('not_required', 'draft', 'pending_review', 'approved', 'rejected'));

update public.actions
set review_state = 'not_required'
where review_state is null;

create index if not exists idx_actions_association_review_queue
  on public.actions(review_state, created_at, id)
  where review_state = 'pending_review';

create or replace function public.is_association_action_review_required(
  p_organizer_type text,
  p_action_phase text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p_action_phase = 'pre_action'
    and p_organizer_type in ('association', 'student_association');
$$;

create or replace function public.is_public_future_pre_action_reviewed(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_review_state text,
  p_action_date date,
  p_event_start_time time
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select p_review_state in ('not_required', 'approved')
    and public.is_public_future_pre_action(
      p_action_phase,
      p_published_at,
      p_moderation_visibility,
      p_status,
      p_action_date,
      p_event_start_time
    );
$$;

revoke all on function public.is_association_action_review_required(text, text) from public, anon, authenticated;
grant execute on function public.is_association_action_review_required(text, text) to service_role;
grant execute on function public.is_public_future_pre_action_reviewed(text, timestamptz, text, text, text, date, time) to public, anon, authenticated, service_role;

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
        or (old.preparation_data ->> 'actionTitle') is distinct from (new.preparation_data ->> 'actionTitle')
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

revoke update (review_state, review_submitted_at, review_decided_at, review_decided_by_clerk_id, review_reason, review_operation_id) on public.actions from public, anon, authenticated;

drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(moderation_visibility, 'visible') = 'visible'
    and coalesce(review_state, 'not_required') in ('not_required', 'approved')
    and (
      (
        status = 'approved'
        and coalesce(action_phase, 'post_action_complete') <> 'pre_action'
      )
      or public.is_public_future_pre_action_reviewed(
        action_phase,
        published_at,
        moderation_visibility,
        status,
        review_state,
        action_date,
        event_start_time
      )
    )
  )
);

create or replace function public.submit_association_action_review(
  p_action_id uuid,
  p_actor_user_id text,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if v_actor is null then raise exception 'Invalid review actor'; end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if v_action.created_by_clerk_id <> v_actor
     and not exists (
       select 1 from public.action_organizers ao
       where ao.action_id = p_action_id and ao.organizer_clerk_id = v_actor
     ) then
    raise exception 'Forbidden';
  end if;
  if not public.is_association_action_review_required(v_action.organizer_type, v_action.action_phase) then
    return jsonb_build_object('status', 'not_required', 'review_state', v_action.review_state);
  end if;
  if p_expected_updated_at is not null and v_action.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
  end if;
  if v_action.review_state = 'pending_review' then
    return jsonb_build_object('status', 'already_submitted', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
  end if;
  if v_action.review_state = 'approved' then
    return jsonb_build_object('status', 'already_decided', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
  end if;

  if nullif(btrim(v_action.location_label), '') is null
     or v_action.action_date is null
     or nullif(btrim(coalesce(v_action.organizer_name, '')), '') is null then
    raise exception 'association_action_content_incomplete';
  end if;

  perform set_config('cleanmymap.association_review_transition', 'on', true);
  update public.actions
  set review_state = 'pending_review',
      review_submitted_at = now(),
      review_decided_at = null,
      review_decided_by_clerk_id = null,
      review_reason = null,
      review_operation_id = null,
      published_at = null
  where id = p_action_id;
  select * into v_action from public.actions where id = p_action_id;
  return jsonb_build_object('status', 'submitted', 'review_state', v_action.review_state, 'updated_at', v_action.updated_at);
end;
$$;

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

revoke all on function public.submit_association_action_review(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.submit_association_action_review(uuid, text, timestamptz) to service_role;
revoke all on function public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz) to service_role;

-- The map function is SECURITY INVOKER, but server-side map reads may use the
-- service role. Keep its explicit source predicate closed over review_state.
create or replace function public.actions_map_feed(
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_zoom integer default null,
  p_status text default null,
  p_floor_date date default null,
  p_types text[] default null,
  p_impact text default null,
  p_limit integer default 80
)
returns table (
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(1, least(coalesce(p_limit, 80), case
    when coalesce(p_zoom, 12) <= 8 then 60
    when coalesce(p_zoom, 12) <= 10 then 120
    when coalesce(p_zoom, 12) <= 12 then 180
    else 300 end)) as value
), action_rows as (
  select 'actions'::text as source, 'action'::text as entity_type, a.id,
    a.created_at, a.updated_at, 'approved'::text as status, a.action_date as observed_at,
    a.location_label, a.latitude, a.longitude, a.waste_kg, a.cigarette_butts,
    a.volunteers_count, a.duration_minutes, a.notes, a.derived_geometry_kind::text,
    a.derived_geometry_geojson, a.geometry_confidence, a.geometry_source::text,
    a.action_context, a.action_context_source, a.school_context_confirmed,
    case when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
      and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage' else null end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035 + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible' end as impact_level
  from public.actions a
  where coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    and (a.status = 'approved' or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'))
    and (coalesce(a.action_phase, 'post_action_complete') <> 'pre_action' or public.is_public_future_pre_action_reviewed(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.review_state, a.action_date, a.event_start_time))
    and not (coalesce(a.action_context, '') = 'school' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action' and public.is_public_future_pre_action_reviewed(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.review_state, a.action_date, a.event_start_time))
    and (p_floor_date is null or a.action_date >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select 'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id, s.created_at, null::timestamptz as updated_at, s.status,
    s.created_at::date as observed_at, s.label as location_label, s.latitude, s.longitude,
    null::numeric as waste_kg, null::integer as cigarette_butts, null::integer as volunteers_count,
    null::integer as duration_minutes, s.notes, null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson, null::numeric as geometry_confidence,
    null::text as geometry_source, null::text as action_context, null::text as action_context_source,
    null::boolean as school_context_confirmed, null::jsonb as observed_coverage,
    null::jsonb as public_preparation_data, 'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (p_types is null or (case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end) = any(p_types))
    and s.latitude is not null and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select source, entity_type, id, created_at, updated_at, status, observed_at,
  location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count,
  duration_minutes, notes, derived_geometry_kind, derived_geometry_geojson,
  geometry_confidence, geometry_source, action_context, action_context_source,
  school_context_confirmed, observed_coverage, public_preparation_data
from (select * from action_rows union all select * from spot_rows) map_rows
where p_impact is null or impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.actions a
    where a.id = p_action_id
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
      and public.is_public_future_pre_action(
        a.action_phase, a.published_at, a.moderation_visibility, a.status,
        a.action_date, a.event_start_time
      )
  );
$$;
