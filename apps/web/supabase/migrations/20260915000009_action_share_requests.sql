-- Public action sharing covers two public states:
--   * a published visible future pre-action (invitation);
--   * a published visible approved completed action (result/feedback).
-- The first-contact request below is communication state only. It never grants
-- action participation, mutation, moderation or access to private data.

create or replace function public.is_public_action_reference_available(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_action_date date,
  p_event_start_time time
)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(p_moderation_visibility, 'visible') = 'visible'
    and p_published_at is not null
    and (
      public.is_public_future_pre_action(
        p_action_phase,
        p_published_at,
        p_moderation_visibility,
        p_status,
        p_action_date,
        p_event_start_time
      )
      or (
        p_action_phase = 'post_action_complete'
        and p_status = 'approved'
      )
    );
$$;

revoke all on function public.is_public_action_reference_available(
  text, timestamptz, text, text, date, time
) from public, anon, authenticated;
grant execute on function public.is_public_action_reference_available(
  text, timestamptz, text, text, date, time
) to service_role;

-- All action references, including those sent through an existing DM, use the
-- same public contract as the selector and the public reference endpoint.
create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
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
  );
$$;

revoke all on function public.can_insert_action_message_reference(uuid) from public, anon;
grant execute on function public.can_insert_action_message_reference(uuid) to authenticated, service_role;

create or replace function public.can_view_action_conversation(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.action_conversations c
    join public.actions a on a.id = c.action_id
    where c.id = p_conversation_id
      and public.is_public_action_reference_available(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
      and (
        (select auth.role()) = 'service_role'
        or (
          (select auth.role()) = 'authenticated'
          and (select auth.jwt()) ->> 'sub' is not null
          and not exists (
            select 1
            from public.action_conversation_exclusions e
            where e.conversation_id = c.id
              and e.user_id = (select auth.jwt()) ->> 'sub'
              and e.active
          )
        )
      )
  );
$$;

revoke all on function public.can_view_action_conversation(uuid) from public, anon;
grant execute on function public.can_view_action_conversation(uuid) to authenticated, service_role;

create table if not exists public.action_share_contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  sender_id text not null,
  recipient_id text not null,
  action_id uuid not null references public.actions(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'ignored')),
  responded_at timestamptz,
  constraint action_share_contact_requests_distinct_users
    check (sender_id <> recipient_id)
);

create unique index if not exists action_share_contact_requests_active_pair_idx
  on public.action_share_contact_requests(sender_id, recipient_id)
  where status = 'pending';

alter table public.app_messages
  add column if not exists action_share_request_id uuid
  references public.action_share_contact_requests(id) on delete set null;

create unique index if not exists action_share_contact_requests_message_idx
  on public.app_messages(action_share_request_id)
  where action_share_request_id is not null;

create index if not exists action_share_contact_requests_recipient_idx
  on public.action_share_contact_requests(recipient_id, status, created_at desc);

alter table public.action_share_contact_requests enable row level security;
revoke all on table public.action_share_contact_requests from public, anon, authenticated;
grant all on table public.action_share_contact_requests to service_role;

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
    'Nouvelle demande de partage',
    'Un membre souhaite vous partager une action publique.',
    jsonb_build_object(
      'href', '/sections/messagerie?tab=dm&contactRequestId=' || v_request_id,
      'channelType', 'dm',
      'requestId', v_request_id,
      'actionId', p_action_id,
      'conversationPartnerId', p_sender_id,
      'requestKind', 'action_share'
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
  join public.profiles p on p.id = r.sender_id
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

  if p_decision = 'reject' or p_decision = 'ignore' then
    update public.action_share_contact_requests
    set status = case when p_decision = 'reject' then 'rejected' else 'ignored' end,
        responded_at = timezone('utc', now())
    where id = v_request.id;
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

  insert into public.app_notifications (user_id, type, title, content, payload)
  values (
    v_request.sender_id,
    'chat',
    'Partage accepté',
    'Votre demande de partage a été acceptée.',
    jsonb_build_object(
      'channelType', 'dm',
      'messageId', v_message_id,
      'actionId', v_request.action_id,
      'conversationPartnerId', v_request.recipient_id
    )
  );

  return query select 'accepted', v_message_id, v_request.action_id, v_request.sender_id;
end;
$$;

revoke all on function public.respond_action_share_request(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_action_share_request(uuid, text, text)
  to service_role;
