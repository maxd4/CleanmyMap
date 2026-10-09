-- Harmonise the already existing in-app action-share notifications.
-- This is append-only: the applied request lifecycle is preserved while its
-- notification presentation and durable decision state are corrected.
-- PURPOSE: identify the sender/action and persist the decision on the original card.
-- CALLER: server-only action-share routes through the service-role RPC boundary.
-- AUTHORIZATION_BOUNDARY: service_role plus recipient ownership in the response RPC.
-- IDEMPOTENCY: the existing pending-row lock and terminal request status remain authoritative.
-- ATOMICITY: request status, notification state and result notification share each RPC transaction.
-- FAILURE_BEHAVIOR: an RPC error rolls back the request and its notification changes.
-- SEARCH_PATH: each SECURITY DEFINER function fixes `public, pg_catalog`.
-- GRANTS: execute remains restricted to service_role.

create or replace function public.create_action_share_request(
  p_sender_id text,
  p_recipient_id text,
  p_action_id uuid,
  p_content text
)
returns table(request_id uuid, result text, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_existing_id uuid;
  v_latest_created_at timestamptz;
  v_request_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_sender_label text;
  v_action_label text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if nullif(btrim(p_sender_id), '') is null
    or nullif(btrim(p_recipient_id), '') is null
    or p_sender_id = p_recipient_id
    or p_action_id is null
    or nullif(btrim(p_content), '') is null
    or char_length(p_content) > 2000
  then
    raise exception 'Invalid action share request';
  end if;

  if not exists (
    select 1
    from public.actions a
    where a.id = p_action_id
      and public.is_public_action_reference_available(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
  ) then
    raise exception 'Action share unavailable';
  end if;

  select
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.handle), ''), p_sender_id),
    coalesce(nullif(btrim(a.preparation_data ->> 'actionTitle'), ''), nullif(btrim(a.location_label), ''), 'action publique')
  into v_sender_label, v_action_label
  from public.actions a
  left join public.profiles p on p.id = p_sender_id
  where a.id = p_action_id;

  perform pg_advisory_xact_lock(
    hashtextextended(p_sender_id || ':' || p_recipient_id, 0)
  );

  select r.id into v_existing_id
  from public.action_share_contact_requests r
  where r.sender_id = p_sender_id
    and r.recipient_id = p_recipient_id
    and r.status = 'pending'
  order by r.created_at desc
  limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, 'already_pending', null::integer;
    return;
  end if;

  if exists (
    select 1
    from public.app_messages m
    where m.sender_id = p_sender_id
      and m.recipient_id = p_recipient_id
      and m.action_id = p_action_id
      and m.channel_type = 'dm'
  ) then
    return query select null::uuid, 'already_shared', null::integer;
    return;
  end if;

  select max(r.created_at) into v_latest_created_at
  from public.action_share_contact_requests r
  where r.sender_id = p_sender_id
    and r.recipient_id = p_recipient_id
    and r.status in ('rejected', 'ignored');

  if v_latest_created_at is not null
    and v_latest_created_at > v_now - interval '24 hours'
  then
    return query select
      null::uuid,
      'cooldown',
      greatest(1, ceil(extract(epoch from ((v_latest_created_at + interval '24 hours') - v_now)))::integer);
    return;
  end if;

  insert into public.action_share_contact_requests (
    sender_id, recipient_id, action_id, content
  )
  values (p_sender_id, p_recipient_id, p_action_id, btrim(p_content))
  returning id into v_request_id;

  insert into public.app_notifications (user_id, type, title, content, payload)
  values (
    p_recipient_id,
    'chat',
    format('Demande de partage de %s', v_sender_label),
    format('%s souhaite vous partager l’action « %s ».', v_sender_label, v_action_label),
    jsonb_build_object(
      'href', '/sections/messagerie?tab=dm&contactRequestId=' || v_request_id,
      'channelType', 'dm',
      'requestId', v_request_id,
      'requestKind', 'action_share',
      'actionId', p_action_id,
      'conversationPartnerId', p_sender_id,
      'conversationPartnerLabel', v_sender_label,
      'actionLabel', v_action_label,
      'decisionState', 'pending'
    )
  );

  return query select v_request_id, 'created', null::integer;
end;
$$;

revoke all on function public.create_action_share_request(text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_action_share_request(text, text, uuid, text)
  to service_role;

create or replace function public.list_action_share_requests_for_recipient(
  p_recipient_id text
)
returns table(
  request_id uuid,
  created_at timestamptz,
  sender_id text,
  sender_display_name text,
  sender_handle text,
  sender_avatar_url text,
  action_id uuid,
  content text
)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select r.id,
    r.created_at,
    r.sender_id,
    p.display_name,
    p.handle,
    p.avatar_url,
    r.action_id,
    r.content
  from public.action_share_contact_requests r
  left join public.profiles p on p.id = r.sender_id
  where (select auth.role()) = 'service_role'
    and r.recipient_id = p_recipient_id
    and r.status = 'pending'
  order by r.created_at desc;
$$;

revoke all on function public.list_action_share_requests_for_recipient(text)
  from public, anon, authenticated;
grant execute on function public.list_action_share_requests_for_recipient(text)
  to service_role;

create or replace function public.respond_action_share_request(
  p_request_id uuid,
  p_recipient_id text,
  p_decision text
)
returns table(status text, message_id uuid, action_id uuid, sender_id text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request public.action_share_contact_requests%rowtype;
  v_action public.actions%rowtype;
  v_message_id uuid;
  v_action_label text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_decision not in ('accept', 'reject', 'ignore') then
    raise exception 'Invalid action share request decision';
  end if;

  select * into v_request
  from public.action_share_contact_requests
  where id = p_request_id
  for update;

  if not found or v_request.recipient_id <> p_recipient_id then
    raise exception 'Action share request not found';
  end if;

  if v_request.status <> 'pending' then
    select m.id into v_message_id
    from public.app_messages m
    where m.action_share_request_id = v_request.id;
    return query select v_request.status, v_message_id, v_request.action_id, v_request.sender_id;
    return;
  end if;

  select coalesce(nullif(btrim(a.preparation_data ->> 'actionTitle'), ''), nullif(btrim(a.location_label), ''), 'action publique')
  into v_action_label
  from public.actions a
  where a.id = v_request.action_id;

  if p_decision = 'reject' or p_decision = 'ignore' then
    update public.action_share_contact_requests
    set status = case when p_decision = 'reject' then 'rejected' else 'ignored' end,
        responded_at = timezone('utc', now())
    where id = v_request.id;

    update public.app_notifications
    set payload = payload || jsonb_build_object(
      'decisionState', 'treated',
      'decision', case when p_decision = 'reject' then 'rejected' else 'ignored' end
    )
    where user_id = v_request.recipient_id
      and type = 'chat'
      and payload ->> 'requestKind' = 'action_share'
      and payload ->> 'requestId' = v_request.id::text;

    if p_decision = 'reject' then
      insert into public.app_notifications (user_id, type, title, content, payload)
      values (
        v_request.sender_id,
        'chat',
        'Partage refusé',
        format('Votre demande de partage de l’action « %s » a été refusée.', coalesce(v_action_label, 'publique')),
        jsonb_build_object(
          'channelType', 'dm',
          'requestId', v_request.id,
          'requestKind', 'action_share',
          'actionId', v_request.action_id,
          'conversationPartnerId', v_request.recipient_id,
          'decisionState', 'treated',
          'decision', 'rejected'
        )
      );
    end if;

    return query select case when p_decision = 'reject' then 'rejected' else 'ignored' end,
      null::uuid, v_request.action_id, v_request.sender_id;
    return;
  end if;

  select * into v_action from public.actions where id = v_request.action_id;
  if not found or not public.is_public_action_reference_available(
    v_action.action_phase,
    v_action.published_at,
    v_action.moderation_visibility,
    v_action.status,
    v_action.action_date,
    v_action.event_start_time
  ) then
    update public.action_share_contact_requests
    set status = 'rejected', responded_at = timezone('utc', now())
    where id = v_request.id;

    update public.app_notifications
    set payload = payload || jsonb_build_object('decisionState', 'unavailable')
    where user_id = v_request.recipient_id
      and type = 'chat'
      and payload ->> 'requestKind' = 'action_share'
      and payload ->> 'requestId' = v_request.id::text;

    return query select 'unavailable', null::uuid, v_request.action_id, v_request.sender_id;
    return;
  end if;

  insert into public.app_messages (
    sender_id, recipient_id, channel_type, message_kind, content,
    action_id, action_share_request_id
  )
  values (
    v_request.sender_id, v_request.recipient_id, 'dm', 'message',
    v_request.content, v_request.action_id, v_request.id
  )
  returning id into v_message_id;

  update public.action_share_contact_requests
  set status = 'accepted', responded_at = timezone('utc', now())
  where id = v_request.id;

  update public.app_notifications
  set payload = payload || jsonb_build_object(
    'decisionState', 'treated',
    'decision', 'accepted'
  )
  where user_id = v_request.recipient_id
    and type = 'chat'
    and payload ->> 'requestKind' = 'action_share'
    and payload ->> 'requestId' = v_request.id::text;

  insert into public.app_notifications (user_id, type, title, content, payload)
  values (
    v_request.sender_id,
    'chat',
    'Partage accepté',
    format('Votre demande de partage de l’action « %s » a été acceptée.', coalesce(v_action_label, 'publique')),
    jsonb_build_object(
      'channelType', 'dm',
      'messageId', v_message_id,
      'requestId', v_request.id,
      'requestKind', 'action_share',
      'actionId', v_request.action_id,
      'conversationPartnerId', v_request.recipient_id,
      'decisionState', 'treated',
      'decision', 'accepted'
    )
  );

  return query select 'accepted', v_message_id, v_request.action_id, v_request.sender_id;
end;
$$;

revoke all on function public.respond_action_share_request(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_action_share_request(uuid, text, text)
  to service_role;
