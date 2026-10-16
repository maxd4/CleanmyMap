-- 20261016000005_feedback_follow_up.sql
-- PURPOSE: keep product follow-up separate from relevance qualification and expose
--          one auditable delivery proof and notification event per feedback.
-- CALLER: server-only update_community_bug_report_tracking through the max-only
--         creator-inbox HTTP guard.
-- AUTHORIZATION_BOUNDARY: service_role execution plus Clerk IMU-owner verification
--                         in the HTTP route; community_bug_reports remains service-only.
-- IDEMPOTENCY: row lock, unchanged-state short circuit and a persistent first-shipped
--              notification timestamp prevent duplicate delivery notifications.
-- ATOMICITY: tracking state, audit record and first delivery notification commit together.
-- FAILURE_BEHAVIOR: validation or notification persistence errors roll back the tracking update.
-- SEARCH_PATH: fixed to pg_catalog, public for the SECURITY DEFINER function.
-- GRANTS: EXECUTE is revoked from public, anon and authenticated; service_role only.
-- FORWARD_ONLY: extends the published feedback qualification contract without rewriting it.

alter table public.community_bug_reports
  add column if not exists tracking_status text not null default 'not_planned',
  add column if not exists tracking_public_summary text,
  add column if not exists tracking_reference text,
  add column if not exists tracking_shipped_on date,
  add column if not exists tracking_shipped_notification_at timestamptz,
  add column if not exists tracking_updated_at timestamptz,
  add column if not exists tracking_updated_by_user_id text;

alter table public.community_bug_reports
  drop constraint if exists community_bug_reports_tracking_status_check;

alter table public.community_bug_reports
  add constraint community_bug_reports_tracking_status_check
  check (tracking_status in ('not_planned', 'under_study', 'planned', 'in_progress', 'shipped'));

create index if not exists idx_community_bug_reports_tracking_status
  on public.community_bug_reports(tracking_status);

create unique index if not exists app_notifications_feedback_tracking_event_idx
  on public.app_notifications (
    user_id,
    type,
    ((payload ->> 'feedbackTrackingEventKey'))
  )
  where type = 'community'
    and payload ? 'feedbackTrackingEventKey';

create or replace function public.update_community_bug_report_tracking(
  p_feedback_id uuid,
  p_tracking_status text,
  p_public_summary text,
  p_reference text,
  p_shipped_on date,
  p_actor_user_id text,
  p_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_previous_status text;
  v_previous_summary text;
  v_previous_reference text;
  v_previous_shipped_on date;
  v_next_summary text;
  v_next_reference text;
  v_next_shipped_on date;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_summary text := nullif(btrim(p_public_summary), '');
  v_reference text := nullif(btrim(p_reference), '');
  v_should_notify boolean := false;
  v_title text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if v_actor is null or v_operation is null then
    raise exception 'Invalid tracking actor';
  end if;

  if p_tracking_status not in ('not_planned', 'under_study', 'planned', 'in_progress', 'shipped') then
    raise exception 'Invalid tracking status';
  end if;

  if char_length(coalesce(v_summary, '')) > 1000 then
    raise exception 'Tracking summary is too long';
  end if;

  if char_length(coalesce(v_reference, '')) > 240 then
    raise exception 'Tracking reference is too long';
  end if;

  if p_shipped_on is not null and p_shipped_on > current_date then
    raise exception 'Tracking delivery date cannot be in the future';
  end if;

  select *
  into v_feedback
  from public.community_bug_reports
  where id = p_feedback_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'item', null);
  end if;

  v_previous_status := coalesce(v_feedback.tracking_status, 'not_planned');
  v_previous_summary := v_feedback.tracking_public_summary;
  v_previous_reference := v_feedback.tracking_reference;
  v_previous_shipped_on := v_feedback.tracking_shipped_on;
  v_next_summary := coalesce(v_summary, v_previous_summary);
  v_next_reference := coalesce(v_reference, v_previous_reference);
  v_next_shipped_on := coalesce(p_shipped_on, v_previous_shipped_on);

  if p_tracking_status = 'shipped'
     and (v_next_summary is null or v_next_shipped_on is null) then
    raise exception 'Shipped feedback requires a public summary and confirmed delivery date';
  end if;

  if v_previous_status = p_tracking_status
     and v_previous_summary is not distinct from v_next_summary
     and v_previous_reference is not distinct from v_next_reference
     and v_previous_shipped_on is not distinct from v_next_shipped_on then
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;

  v_should_notify :=
    p_tracking_status = 'shipped'
    and v_previous_status <> 'shipped'
    and v_feedback.tracking_shipped_notification_at is null
    and nullif(btrim(v_feedback.submitted_by_user_id), '') is not null
    and lower(btrim(v_feedback.submitted_by_user_id)) <> 'unknown';

  update public.community_bug_reports
  set tracking_status = p_tracking_status,
      tracking_public_summary = v_next_summary,
      tracking_reference = v_next_reference,
      tracking_shipped_on = v_next_shipped_on,
      tracking_shipped_notification_at = case
        when v_should_notify then now()
        else tracking_shipped_notification_at
      end,
      tracking_updated_at = now(),
      tracking_updated_by_user_id = v_actor
  where id = p_feedback_id;

  select *
  into v_feedback
  from public.community_bug_reports
  where id = p_feedback_id;

  insert into public.admin_operations_audit (
    operation_id,
    at,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    target_user_id,
    details
  ) values (
    v_operation,
    now(),
    v_actor,
    'admin_operation',
    'success',
    p_feedback_id::text,
    v_feedback.submitted_by_user_id,
    jsonb_build_object(
      'operation', 'feedback_tracking_update',
      'previousValue', jsonb_build_object(
        'trackingStatus', v_previous_status,
        'trackingPublicSummary', v_previous_summary,
        'trackingReference', v_previous_reference,
        'trackingShippedOn', v_previous_shipped_on
      ),
      'newValue', jsonb_build_object(
        'trackingStatus', p_tracking_status,
        'trackingPublicSummary', v_next_summary,
        'trackingReference', v_next_reference,
        'trackingShippedOn', v_next_shipped_on
      )
    )
  );

  if v_should_notify then
    v_title := 'La correction de votre feedback a été livrée';
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    ) values (
      v_feedback.submitted_by_user_id,
      'community',
      v_title,
      coalesce(v_next_summary, v_title) || ' Consultez le suivi de votre retour.',
      jsonb_build_object(
        'entityType', 'feedback',
        'id', v_feedback.id,
        'trackingStatus', 'shipped',
        'feedbackTrackingEventKey', 'feedback-shipped:' || v_feedback.id::text,
        'href', '/sections/feedback#mes-retours'
      )
    );
  end if;

  return jsonb_build_object('status', 'updated', 'item', to_jsonb(v_feedback));
end;
$$;

revoke all on function public.update_community_bug_report_tracking(uuid, text, text, text, date, text, text)
  from public, anon, authenticated;
grant execute on function public.update_community_bug_report_tracking(uuid, text, text, text, date, text, text)
  to service_role;
