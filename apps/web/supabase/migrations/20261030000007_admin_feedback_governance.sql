-- 20261030000007_admin_feedback_governance.sql
-- PURPOSE: persist feedback priority/removal and make ordinary admin decisions atomic.
-- AUTHORIZATION_BOUNDARY: server routes enforce Clerk admin/max access; RPCs accept service_role only.
-- ATOMICITY: each state, priority or active-queue removal mutation writes its audit row in the same transaction.
-- IDEMPOTENCY: operation_id is locked and unique; retries return the persisted result without replaying the mutation.
-- IMMUTABILITY: admin_operations_audit has no UPDATE/DELETE grants and a database trigger rejects both verbs.
-- FORWARD_ONLY: adds nullable removal metadata and defaults legacy feedback to normal priority.

alter table public.community_bug_reports
  add column if not exists priority text not null default 'normal',
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by_user_id text,
  add column if not exists removed_reason text;

alter table public.community_bug_reports
  drop constraint if exists community_bug_reports_priority_check;

alter table public.community_bug_reports
  add constraint community_bug_reports_priority_check
  check (priority in ('normal', 'high', 'critical'));

create index if not exists idx_community_bug_reports_active_priority_created
  on public.community_bug_reports(priority asc, created_at asc, id asc)
  where removed_at is null;

create index if not exists idx_community_bug_reports_removed_at
  on public.community_bug_reports(removed_at)
  where removed_at is not null;

alter table public.admin_operations_audit
  add column if not exists target_user_id text;

revoke update, delete on table public.admin_operations_audit from public, anon, authenticated, service_role;
grant select, insert on table public.admin_operations_audit to service_role;

drop policy if exists admin_operations_audit_service_only on public.admin_operations_audit;
create policy admin_operations_audit_service_read_insert on public.admin_operations_audit
  for select
  using (auth.role() = 'service_role');

create policy admin_operations_audit_service_insert on public.admin_operations_audit
  for insert
  with check (auth.role() = 'service_role');

create or replace function public.prevent_admin_operations_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'admin_operations_audit is append-only';
end;
$$;

drop trigger if exists admin_operations_audit_append_only on public.admin_operations_audit;
create trigger admin_operations_audit_append_only
before update or delete on public.admin_operations_audit
for each row execute function public.prevent_admin_operations_audit_mutation();

create or replace function public.update_community_bug_report_status(
  p_feedback_id uuid,
  p_status text,
  p_actor_user_id text,
  p_operation_id text,
  p_expected_status text,
  p_expected_creator_state text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_existing public.admin_operations_audit%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_next_creator_state text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if v_actor is null or v_operation is null then raise exception 'Invalid feedback mutation actor'; end if;
  if p_status not in ('open', 'treated', 'archived') then raise exception 'Invalid feedback status'; end if;
  v_next_creator_state := case p_status when 'open' then 'new' when 'treated' then 'treated' else 'archived' end;

  perform pg_advisory_xact_lock(hashtextextended(v_operation, 0));
  select * into v_existing from public.admin_operations_audit where operation_id = v_operation for update;
  if found then
    select * into v_feedback from public.community_bug_reports where id = p_feedback_id;
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;

  select * into v_feedback from public.community_bug_reports where id = p_feedback_id for update;
  if not found then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text,
      jsonb_build_object('operation', 'feedback_state_changed', 'reason', 'Feedback not found'));
    return jsonb_build_object('status', 'not_found', 'item', null);
  end if;

  if v_feedback.status is distinct from p_expected_status
     or v_feedback.creator_state is distinct from p_expected_creator_state then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text, v_feedback.submitted_by_user_id,
      jsonb_build_object('operation', 'feedback_state_changed', 'previousValue', jsonb_build_object('status', v_feedback.status, 'creatorState', v_feedback.creator_state),
        'newValue', jsonb_build_object('status', p_status, 'creatorState', v_next_creator_state), 'conflict', true));
    return jsonb_build_object('status', 'conflict', 'item', to_jsonb(v_feedback));
  end if;

  update public.community_bug_reports
  set status = p_status, creator_state = v_next_creator_state
  where id = p_feedback_id;
  select * into v_feedback from public.community_bug_reports where id = p_feedback_id;

  insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
  values (v_operation, v_actor, 'admin_operation', 'success', p_feedback_id::text, v_feedback.submitted_by_user_id,
    jsonb_build_object('operation', 'feedback_state_changed', 'previousValue', jsonb_build_object('status', p_expected_status, 'creatorState', p_expected_creator_state),
      'newValue', jsonb_build_object('status', p_status, 'creatorState', v_next_creator_state)));
  return jsonb_build_object('status', 'updated', 'item', to_jsonb(v_feedback));
end;
$$;

create or replace function public.change_community_bug_report_priority(
  p_feedback_id uuid,
  p_priority text,
  p_reason text,
  p_actor_user_id text,
  p_operation_id text,
  p_expected_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_existing public.admin_operations_audit%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_reason text := nullif(btrim(p_reason), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if v_actor is null or v_operation is null or v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500 then raise exception 'Invalid feedback priority reason'; end if;
  if p_priority not in ('normal', 'high', 'critical') then raise exception 'Invalid feedback priority'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_operation, 0));
  select * into v_existing from public.admin_operations_audit where operation_id = v_operation for update;
  if found then
    select * into v_feedback from public.community_bug_reports where id = p_feedback_id;
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;
  select * into v_feedback from public.community_bug_reports where id = p_feedback_id for update;
  if not found then return jsonb_build_object('status', 'not_found', 'item', null); end if;

  if v_feedback.priority is distinct from p_expected_priority then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text, v_feedback.submitted_by_user_id,
      jsonb_build_object('operation', 'feedback_priority_changed', 'reason', v_reason,
        'previousValue', jsonb_build_object('priority', v_feedback.priority), 'newValue', jsonb_build_object('priority', p_priority), 'conflict', true));
    return jsonb_build_object('status', 'conflict', 'item', to_jsonb(v_feedback));
  end if;

  update public.community_bug_reports set priority = p_priority where id = p_feedback_id;
  select * into v_feedback from public.community_bug_reports where id = p_feedback_id;
  insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
  values (v_operation, v_actor, 'admin_operation', 'success', p_feedback_id::text, v_feedback.submitted_by_user_id,
    jsonb_build_object('operation', 'feedback_priority_changed', 'reason', v_reason,
      'previousValue', jsonb_build_object('priority', p_expected_priority), 'newValue', jsonb_build_object('priority', p_priority)));
  return jsonb_build_object('status', case when p_priority = p_expected_priority then 'unchanged' else 'updated' end, 'item', to_jsonb(v_feedback));
end;
$$;

create or replace function public.remove_community_bug_report_from_active_queue(
  p_feedback_id uuid,
  p_reason text,
  p_actor_user_id text,
  p_operation_id text,
  p_expected_status text,
  p_expected_creator_state text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_existing public.admin_operations_audit%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_reason text := nullif(btrim(p_reason), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if v_actor is null or v_operation is null or v_reason is null or char_length(v_reason) < 5 or char_length(v_reason) > 500 then raise exception 'Invalid feedback removal reason'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_operation, 0));
  select * into v_existing from public.admin_operations_audit where operation_id = v_operation for update;
  if found then
    select * into v_feedback from public.community_bug_reports where id = p_feedback_id;
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;
  select * into v_feedback from public.community_bug_reports where id = p_feedback_id for update;
  if not found then return jsonb_build_object('status', 'not_found', 'item', null); end if;

  if v_feedback.removed_at is not null
     or v_feedback.status is distinct from p_expected_status
     or v_feedback.creator_state is distinct from p_expected_creator_state then
    insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
    values (v_operation, v_actor, 'admin_operation', 'error', p_feedback_id::text, v_feedback.submitted_by_user_id,
      jsonb_build_object('operation', 'feedback_removed_from_active_queue', 'reason', v_reason,
        'previousValue', jsonb_build_object('status', v_feedback.status, 'creatorState', v_feedback.creator_state, 'removedAt', v_feedback.removed_at),
        'newValue', jsonb_build_object('removed', true), 'conflict', true));
    return jsonb_build_object('status', 'conflict', 'item', to_jsonb(v_feedback));
  end if;

  update public.community_bug_reports
  set removed_at = now(), removed_by_user_id = v_actor, removed_reason = v_reason
  where id = p_feedback_id;
  select * into v_feedback from public.community_bug_reports where id = p_feedback_id;
  insert into public.admin_operations_audit(operation_id, actor_user_id, operation_type, outcome, target_id, target_user_id, details)
  values (v_operation, v_actor, 'admin_operation', 'success', p_feedback_id::text, v_feedback.submitted_by_user_id,
    jsonb_build_object('operation', 'feedback_removed_from_active_queue', 'reason', v_reason,
      'previousValue', jsonb_build_object('status', p_expected_status, 'creatorState', p_expected_creator_state, 'removed', false),
      'newValue', jsonb_build_object('removed', true, 'removedAt', v_feedback.removed_at)));
  return jsonb_build_object('status', 'updated', 'item', to_jsonb(v_feedback));
end;
$$;

revoke all on function public.update_community_bug_report_status(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.change_community_bug_report_priority(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.remove_community_bug_report_from_active_queue(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_community_bug_report_status(uuid, text, text, text, text, text) to service_role;
grant execute on function public.change_community_bug_report_priority(uuid, text, text, text, text, text) to service_role;
grant execute on function public.remove_community_bug_report_from_active_queue(uuid, text, text, text, text, text) to service_role;
