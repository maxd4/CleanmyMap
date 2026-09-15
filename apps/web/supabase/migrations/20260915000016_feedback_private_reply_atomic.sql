-- Atomic, idempotent admin reply to a community feedback report.
-- The route performs AuthN/AuthZ; this function is deliberately service_role-only.

alter table public.app_messages
  add column if not exists feedback_reply_operation_id text,
  add column if not exists feedback_reply_feedback_id uuid
    references public.community_bug_reports(id) on delete restrict;

create unique index if not exists app_messages_feedback_reply_operation_idx
  on public.app_messages(feedback_reply_operation_id)
  where feedback_reply_operation_id is not null;

alter table public.admin_operations_audit
  add column if not exists target_user_id text;

create or replace function public.send_feedback_private_reply(
  p_operation_id text,
  p_actor_user_id text,
  p_feedback_id text,
  p_recipient_id text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_feedback public.community_bug_reports%rowtype;
  v_message public.app_messages%rowtype;
  v_message_json jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if nullif(btrim(p_operation_id), '') is null
    or nullif(btrim(p_actor_user_id), '') is null
    or nullif(btrim(p_feedback_id), '') is null
    or nullif(btrim(p_recipient_id), '') is null
    or nullif(btrim(p_content), '') is null
    or char_length(p_content) > 2000
  then
    raise exception 'Invalid feedback private reply';
  end if;

  -- Serialize retries and prevent two transactions from racing the unique key.
  perform pg_advisory_xact_lock(hashtextextended(btrim(p_operation_id), 0));

  select *
  into v_feedback
  from public.community_bug_reports
  where id::text = btrim(p_feedback_id)
  for update;

  if not found
    or nullif(btrim(v_feedback.submitted_by_user_id), '') is null
    or lower(btrim(v_feedback.submitted_by_user_id)) = 'unknown'
    or v_feedback.submitted_by_user_id <> btrim(p_recipient_id)
  then
    raise exception 'Feedback recipient is not canonical';
  end if;

  select *
  into v_message
  from public.app_messages
  where feedback_reply_operation_id = btrim(p_operation_id);

  if found then
    if v_message.sender_id <> btrim(p_actor_user_id)
      or v_message.recipient_id <> btrim(p_recipient_id)
      or v_message.feedback_reply_feedback_id is distinct from v_feedback.id
    then
      raise exception 'Feedback reply operation conflict';
    end if;

    select to_jsonb(m) || jsonb_build_object(
      'sender', jsonb_build_object(
        'display_name', p.display_name,
        'handle', p.handle,
        'avatar_url', p.avatar_url
      ),
      'poll_options', '[]'::jsonb
    )
    into v_message_json
    from public.app_messages m
    left join public.profiles p on p.id = m.sender_id
    where m.id = v_message.id;

    return jsonb_build_object('already_processed', true, 'message', v_message_json);
  end if;

  insert into public.app_messages (
    sender_id,
    recipient_id,
    channel_type,
    message_kind,
    content,
    feedback_reply_operation_id,
    feedback_reply_feedback_id
  )
  values (
    btrim(p_actor_user_id),
    btrim(p_recipient_id),
    'dm',
    'message',
    p_content,
    btrim(p_operation_id),
    v_feedback.id
  )
  returning * into v_message;

  update public.community_bug_reports
  set creator_state = 'responded'
  where id = v_feedback.id;

  insert into public.admin_operations_audit (
    operation_id,
    at,
    actor_user_id,
    operation_type,
    outcome,
    target_id,
    target_user_id,
    details
  )
  values (
    btrim(p_operation_id),
    timezone('utc', now()),
    btrim(p_actor_user_id),
    'admin_operation',
    'success',
    v_feedback.id::text,
    btrim(p_recipient_id),
    jsonb_build_object(
      'operation', 'feedback_private_reply_sent',
      'messageSent', true,
      'previousValue', jsonb_build_object(
        'source', 'feedback',
        'creatorState', v_feedback.creator_state
      ),
      'newValue', jsonb_build_object(
        'source', 'feedback',
        'creatorState', 'responded'
      )
    )
  );

  select to_jsonb(m) || jsonb_build_object(
    'sender', jsonb_build_object(
      'display_name', p.display_name,
      'handle', p.handle,
      'avatar_url', p.avatar_url
    ),
    'poll_options', '[]'::jsonb
  )
  into v_message_json
  from public.app_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.id = v_message.id;

  return jsonb_build_object('already_processed', false, 'message', v_message_json);
end;
$$;

revoke all on function public.send_feedback_private_reply(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.send_feedback_private_reply(text, text, text, text, text)
  to service_role;
