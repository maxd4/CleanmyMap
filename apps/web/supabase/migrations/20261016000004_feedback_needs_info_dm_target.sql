-- 20261016000004_feedback_needs_info_dm_target.sql
-- PURPOSE: route needs_info notifications to the max actor who requested more information.
-- CALLER: server-only qualify_community_bug_report RPC through the max-only HTTP guard.
-- AUTHORIZATION_BOUNDARY: service_role execution plus Clerk identity/IMU-owner verification in the API.
-- IDEMPOTENCY: row lock plus unchanged-state short circuit prevents duplicate notifications on replay.
-- ATOMICITY: qualification, audit and owner notification commit or roll back together.
-- FAILURE_BEHAVIOR: any validation or secondary insert error aborts the transaction.
-- SEARCH_PATH: fixed to pg_catalog, public for the SECURITY DEFINER function.
-- GRANTS: EXECUTE is revoked from public, anon and authenticated; service_role only.
-- FORWARD_ONLY: replaces the published RPC without modifying its migration.

create or replace function public.qualify_community_bug_report(
  p_feedback_id uuid,
  p_decision text,
  p_reason text,
  p_duplicate_feedback_id uuid,
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
  v_previous_reason text;
  v_previous_duplicate uuid;
  v_next_duplicate uuid;
  v_reason text := nullif(btrim(p_reason), '');
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_operation text := nullif(btrim(p_operation_id), '');
  v_title text;
  v_content text;
  v_href text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if v_actor is null or v_operation is null then
    raise exception 'Invalid qualification actor';
  end if;

  if p_decision not in ('pending', 'needs_info', 'accepted', 'duplicate', 'rejected') then
    raise exception 'Invalid qualification decision';
  end if;

  if char_length(coalesce(v_reason, '')) > 500 then
    raise exception 'Qualification reason is too long';
  end if;

  if p_decision in ('needs_info', 'duplicate', 'rejected')
     and char_length(coalesce(v_reason, '')) < 5 then
    raise exception 'Qualification reason is required';
  end if;

  if p_decision = 'duplicate' and p_duplicate_feedback_id is null then
    raise exception 'Duplicate feedback reference is required';
  end if;

  if p_decision <> 'duplicate' and p_duplicate_feedback_id is not null then
    raise exception 'Duplicate feedback reference is not allowed';
  end if;

  select *
  into v_feedback
  from public.community_bug_reports
  where id = p_feedback_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found', 'item', null);
  end if;

  if p_decision = 'duplicate' then
    if p_duplicate_feedback_id = p_feedback_id
       or not exists (
         select 1
         from public.community_bug_reports duplicate_feedback
         where duplicate_feedback.id = p_duplicate_feedback_id
       ) then
      return jsonb_build_object('status', 'duplicate_not_found', 'item', null);
    end if;
  end if;

  v_previous_status := coalesce(v_feedback.qualification_status, 'pending');
  v_previous_reason := v_feedback.qualification_reason;
  v_previous_duplicate := v_feedback.qualification_duplicate_feedback_id;
  v_next_duplicate := case
    when p_decision = 'duplicate' then p_duplicate_feedback_id
    else null
  end;

  if v_previous_status = p_decision
     and v_previous_reason is not distinct from v_reason
     and v_previous_duplicate is not distinct from v_next_duplicate then
    return jsonb_build_object('status', 'unchanged', 'item', to_jsonb(v_feedback));
  end if;

  update public.community_bug_reports
  set qualification_status = p_decision,
      qualification_reason = v_reason,
      qualification_decided_at = now(),
      qualification_decided_by_user_id = v_actor,
      qualification_duplicate_feedback_id = v_next_duplicate
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
    details
  ) values (
    v_operation,
    now(),
    v_actor,
    'admin_operation',
    'success',
    p_feedback_id::text,
    jsonb_build_object(
      'operation', 'feedback_qualification',
      'targetUserId', v_feedback.submitted_by_user_id,
      'previousValue', jsonb_build_object(
        'source', 'feedback',
        'qualificationStatus', v_previous_status,
        'qualificationReason', v_previous_reason,
        'qualificationDuplicateFeedbackId', v_previous_duplicate
      ),
      'newValue', jsonb_build_object(
        'source', 'feedback',
        'qualificationStatus', p_decision,
        'qualificationReason', v_reason,
        'qualificationDuplicateFeedbackId', v_next_duplicate
      )
    )
  );

  if p_decision <> 'pending'
     and nullif(btrim(v_feedback.submitted_by_user_id), '') is not null
     and lower(btrim(v_feedback.submitted_by_user_id)) <> 'unknown' then
    v_title := case p_decision
      when 'needs_info' then 'Précisions demandées sur votre feedback'
      when 'accepted' then 'Votre feedback est pertinent'
      when 'duplicate' then 'Votre feedback est identifié comme doublon'
      when 'rejected' then 'Votre feedback n''est pas retenu'
      else 'Mise à jour de votre feedback'
    end;
    v_content := case
      when v_reason is null then v_title || '.'
      else v_title || ': ' || v_reason
    end;
    v_href := case
      -- DM routing is reconstructed from the explicit recipient and feedback
      -- fields below; a generic href would discard both values.
      when p_decision = 'needs_info' then null
      else '/sections/feedback#mes-retours'
    end;

    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      v_feedback.submitted_by_user_id,
      'community',
      v_title,
      v_content,
      jsonb_build_object(
        'entityType', 'feedback',
        'id', v_feedback.id,
        'qualificationStatus', p_decision,
        'feedbackQualificationOperationId', v_operation,
        'channelType', case when p_decision = 'needs_info' then 'dm' else null end,
        'recipientId', case
          when p_decision = 'needs_info' then v_actor
          else v_feedback.submitted_by_user_id
        end,
        'feedbackId', v_feedback.id,
        'href', v_href
      )
    where not exists (
      select 1
      from public.app_notifications existing_notification
      where existing_notification.user_id = v_feedback.submitted_by_user_id
        and existing_notification.type = 'community'
        and coalesce(existing_notification.payload ->> 'feedbackQualificationOperationId', '') = v_operation
    );
  end if;

  return jsonb_build_object('status', 'updated', 'item', to_jsonb(v_feedback));
end;
$$;

revoke all on function public.qualify_community_bug_report(uuid, text, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.qualify_community_bug_report(uuid, text, text, uuid, text, text)
  to service_role;
