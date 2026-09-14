-- Canonical action discussions: app_messages remains the message source of truth.
-- This migration stores only the action/conversation identity and persistent access.

create table if not exists public.action_conversations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.actions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.action_conversation_members (
  conversation_id uuid not null references public.action_conversations(id) on delete cascade,
  user_id text not null,
  granted_at timestamptz not null default timezone('utc', now()),
  access_source text not null check (access_source in ('owner', 'action_participant')),
  primary key (conversation_id, user_id)
);

alter table public.app_messages
  add column if not exists conversation_id uuid references public.action_conversations(id) on delete cascade;

alter table public.app_messages
  drop constraint if exists app_messages_channel_type_check,
  drop constraint if exists app_messages_action_conversation_check;

alter table public.app_messages
  add constraint app_messages_channel_type_check
    check (channel_type in ('community', 'dm', 'admin_elu', 'territory', 'bug_report', 'action')),
  add constraint app_messages_action_conversation_check
    check (
      (channel_type = 'action' and conversation_id is not null and recipient_id is null and topic_id is null
       and related_event_id is null and arrondissement_id is null and zone_name is null)
      or
      (channel_type <> 'action' and conversation_id is null)
    );

create index if not exists action_conversation_members_user_id_idx
  on public.action_conversation_members (user_id);
create index if not exists app_messages_conversation_created_at_idx
  on public.app_messages (conversation_id, created_at desc, id desc)
  where conversation_id is not null;

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
      and a.published_at is not null
      and (
        (select auth.role()) = 'service_role'
        or (
          (select auth.jwt()) ->> 'sub' is not null
          and (
            exists (
              select 1 from public.profiles p
              where p.id = (select auth.jwt()) ->> 'sub'
                and p.role_label in ('admin', 'max', 'elu')
            )
            or a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'
            or (
              a.moderation_visibility <> 'hidden'
              and exists (
                select 1 from public.action_conversation_members m
                where m.conversation_id = c.id
                  and m.user_id = (select auth.jwt()) ->> 'sub'
              )
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_view_action_conversation(uuid) from public, anon;
grant execute on function public.can_view_action_conversation(uuid) to authenticated, service_role;

alter table public.action_conversations enable row level security;
alter table public.action_conversation_members enable row level security;

revoke all on table public.action_conversations, public.action_conversation_members from anon, authenticated;
grant select on table public.action_conversations, public.action_conversation_members to authenticated;
grant all on table public.action_conversations, public.action_conversation_members to service_role;

drop policy if exists action_conversations_select_authorized on public.action_conversations;
create policy action_conversations_select_authorized
on public.action_conversations
for select
using (public.can_view_action_conversation(id));

drop policy if exists action_conversation_members_select_authorized on public.action_conversation_members;
create policy action_conversation_members_select_authorized
on public.action_conversation_members
for select
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or exists (
    select 1 from public.profiles p
    where p.id = coalesce((select auth.jwt()) ->> 'sub', '')
      and p.role_label in ('admin', 'max', 'elu')
  )
);

drop policy if exists app_messages_select_channels on public.app_messages;
create policy app_messages_select_channels
on public.app_messages
for select
using (
  (
    channel_type = 'community'
    and (select auth.role()) in ('authenticated', 'service_role')
  )
  or (
    channel_type = 'dm'
    and (
      sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  )
  or (
    channel_type = 'admin_elu'
    and public.current_profile_role_label() in ('admin', 'elu')
  )
  or (
    channel_type = 'territory'
    and public.can_view_territory_message(arrondissement_id)
  )
  or (
    channel_type = 'bug_report'
    and (
      sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      or recipient_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  )
  or (channel_type = 'action' and public.can_view_action_conversation(conversation_id))
);

drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
with check (
  (
    channel_type = 'community'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and recipient_id is null
    and arrondissement_id is null
  )
  or (
    channel_type = 'dm'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and recipient_id is not null
    and arrondissement_id is null
  )
  or (
    channel_type = 'admin_elu'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and recipient_id is null
    and arrondissement_id is null
  )
  or (
    channel_type = 'territory'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and arrondissement_id is not null
    and recipient_id is null
  )
  or (
    channel_type = 'bug_report'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and recipient_id is not null
    and recipient_id in (select id from public.profiles where role_label = 'admin')
    and arrondissement_id is null
  )
  or (
    channel_type = 'action'
    and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and conversation_id is not null
    and public.can_view_action_conversation(conversation_id)
  )
);

create or replace function public.ensure_action_conversation_on_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conversation_id uuid;
begin
  if new.published_at is null then
    return new;
  end if;

  insert into public.action_conversations (action_id)
  values (new.id)
  on conflict (action_id) do update set updated_at = timezone('utc', now())
  returning id into v_conversation_id;

  insert into public.action_conversation_members (conversation_id, user_id, access_source)
  values (v_conversation_id, new.created_by_clerk_id, 'owner')
  on conflict (conversation_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.ensure_action_conversation_on_publish() from public, anon, authenticated, service_role;

drop trigger if exists actions_action_conversation_on_publish on public.actions;
create trigger actions_action_conversation_on_publish
after insert or update of published_at on public.actions
for each row execute function public.ensure_action_conversation_on_publish();

insert into public.action_conversations (action_id)
select a.id
from public.actions a
where a.published_at is not null
on conflict (action_id) do nothing;

insert into public.action_conversation_members (conversation_id, user_id, access_source)
select c.id, a.created_by_clerk_id, 'owner'
from public.action_conversations c
join public.actions a on a.id = c.action_id
where a.published_at is not null
on conflict (conversation_id, user_id) do nothing;

create or replace function public.ensure_action_conversation_member(
  p_action_id uuid,
  p_user_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conversation_id uuid;
  v_action public.actions%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select * into v_action from public.actions where id = p_action_id;
  if not found or v_action.published_at is null or v_action.moderation_visibility = 'hidden' then
    raise exception 'Action conversation unavailable';
  end if;

  if v_action.created_by_clerk_id <> p_user_id and not exists (
    select 1 from public.action_participants p
    where p.action_id = p_action_id
      and p.user_id = p_user_id
      and p.participation_status in ('pending', 'confirmed')
  ) then
    raise exception 'Action participation required';
  end if;

  insert into public.action_conversations (action_id)
  values (p_action_id)
  on conflict (action_id) do update set updated_at = timezone('utc', now())
  returning id into v_conversation_id;

  insert into public.action_conversation_members (conversation_id, user_id, access_source)
  values (v_conversation_id, p_user_id, case when v_action.created_by_clerk_id = p_user_id then 'owner' else 'action_participant' end)
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;

revoke all on function public.ensure_action_conversation_member(uuid, text) from public, anon, authenticated;
grant execute on function public.ensure_action_conversation_member(uuid, text) to service_role;

create or replace function public.create_chat_notifications_for_message(p_message_id uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_message record;
  v_sender_label text;
  v_sender_handle text;
  v_content_summary text;
  v_base_payload jsonb;
  v_inserted_count integer := 0;
begin
  select m.id, m.sender_id, m.recipient_id, m.channel_type, m.topic_id, m.message_kind,
    m.zone_name, m.arrondissement_id, m.content, m.conversation_id, c.action_id
  into v_message
  from public.app_messages m
  left join public.action_conversations c on c.id = m.conversation_id
  where m.id = p_message_id;
  if not found then raise exception 'Message not found'; end if;
  if v_message.sender_id <> coalesce((select auth.jwt()) ->> 'sub', '') then raise exception 'Forbidden'; end if;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(handle), ''), 'Membre'), nullif(trim(handle), '')
  into v_sender_label, v_sender_handle from public.profiles where id = v_message.sender_id;
  v_content_summary := btrim(regexp_replace(coalesce(v_message.content, ''), '\s+', ' ', 'g'));
  if char_length(v_content_summary) > 120 then v_content_summary := left(v_content_summary, 117) || '...'; end if;
  v_base_payload := jsonb_strip_nulls(jsonb_build_object(
    'channelType', v_message.channel_type, 'messageId', v_message.id,
    'topicId', v_message.topic_id, 'messageKind', v_message.message_kind,
    'actionId', v_message.action_id
  ));

  if v_message.channel_type = 'action' and v_message.conversation_id is not null then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select m.user_id, 'chat', 'Nouveau message dans l’action', v_content_summary, v_base_payload
    from public.action_conversation_members m
    where m.conversation_id = v_message.conversation_id and m.user_id <> v_message.sender_id
      and not exists (
        select 1 from public.app_notifications n
        where n.user_id = m.user_id and n.type = 'chat'
          and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
          and coalesce(n.payload ->> 'channelType', '') = 'action'
      );
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'dm' and v_message.recipient_id is not null and v_message.recipient_id <> v_message.sender_id then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select v_message.recipient_id, 'chat', 'Message privé de ' || coalesce(v_sender_label, 'Membre'), v_content_summary,
      v_base_payload || jsonb_strip_nulls(jsonb_build_object('conversationPartnerId', v_message.sender_id,
        'conversationPartnerLabel', v_sender_label, 'conversationPartnerHandle', v_sender_handle,
        'recipientId', v_message.sender_id, 'recipientLabel', v_sender_label, 'recipientHandle', v_sender_handle))
    where not exists (select 1 from public.app_notifications n where n.user_id = v_message.recipient_id and n.type = 'chat'
      and coalesce(n.payload ->> 'messageId', '') = v_message.id::text and coalesce(n.payload ->> 'channelType', '') = 'dm');
    get diagnostics v_inserted_count = row_count; return v_inserted_count;
  end if;

  if v_message.channel_type = 'bug_report' and v_message.recipient_id is not null then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select v_message.recipient_id, 'chat', 'Nouveau feedback reçu', v_content_summary, v_base_payload
    where not exists (select 1 from public.app_notifications n where n.user_id = v_message.recipient_id and n.type = 'chat'
      and coalesce(n.payload ->> 'messageId', '') = v_message.id::text and coalesce(n.payload ->> 'channelType', '') = 'bug_report');
    get diagnostics v_inserted_count = row_count; return v_inserted_count;
  end if;

  if v_message.channel_type = 'community' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id, 'chat', 'Nouveau message dans Communauté globale', v_content_summary, v_base_payload
    from public.profiles p where p.id <> v_message.sender_id and not exists
      (select 1 from public.app_notifications n where n.user_id = p.id and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text and coalesce(n.payload ->> 'channelType', '') = 'community') limit 250;
    get diagnostics v_inserted_count = row_count; return v_inserted_count;
  end if;

  if v_message.channel_type = 'admin_elu' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id, 'chat', 'Nouveau message dans Admin & élus', v_content_summary, v_base_payload
    from public.profiles p where p.id <> v_message.sender_id and p.role_label in ('admin', 'max', 'elu') and not exists
      (select 1 from public.app_notifications n where n.user_id = p.id and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text and coalesce(n.payload ->> 'channelType', '') = 'admin_elu') limit 100;
    get diagnostics v_inserted_count = row_count; return v_inserted_count;
  end if;

  if v_message.channel_type = 'territory' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id, 'chat', 'Nouveau message dans Territoire & limitrophes', v_content_summary,
      v_base_payload || jsonb_strip_nulls(jsonb_build_object('zoneName', v_message.zone_name, 'arrondissementId', v_message.arrondissement_id))
    from public.profiles p where p.id <> v_message.sender_id and (
      (v_message.arrondissement_id is not null and public.can_profile_view_territory_message(p.id, v_message.arrondissement_id))
      or (v_message.arrondissement_id is null and v_message.zone_name is not null and lower(coalesce(p.metadata ->> 'zoneName', '')) = lower(v_message.zone_name))
    ) and not exists (select 1 from public.app_notifications n where n.user_id = p.id and n.type = 'chat'
      and coalesce(n.payload ->> 'messageId', '') = v_message.id::text and coalesce(n.payload ->> 'channelType', '') = 'territory');
    get diagnostics v_inserted_count = row_count; return v_inserted_count;
  end if;
  return 0;
end;
$$;

revoke all on function public.create_chat_notifications_for_message(uuid) from public;
grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;

create or replace function public.get_my_unread_chat_notification_counts()
returns table (channel_type text, topic_id text, unread_count bigint)
language sql security invoker set search_path = pg_catalog
as $$
  select n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), ''), count(*)::bigint
  from public.app_notifications n
  where n.user_id = coalesce((select auth.jwt()) ->> 'sub', '') and n.type = 'chat' and n.read_at is null
    and n.payload ->> 'channelType' in ('community', 'territory', 'dm', 'action')
  group by n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), '');
$$;

create or replace function public.mark_my_chat_notifications_read(
  p_channel_type text, p_topic_id text default null, p_dm_peer_id text default null,
  p_action_id uuid default null
)
returns integer
language plpgsql security invoker set search_path = pg_catalog
as $$
declare v_user_id text; v_updated_count integer := 0;
begin
  v_user_id := nullif(btrim(coalesce((select auth.jwt()) ->> 'sub', '')), '');
  if v_user_id is null then raise exception 'Unauthenticated'; end if;
  p_channel_type := nullif(btrim(p_channel_type), '');
  if p_channel_type not in ('community', 'territory', 'dm', 'action') then raise exception 'Unsupported chat notification channel'; end if;
  if p_channel_type = 'action' then
    if p_topic_id is not null or p_dm_peer_id is not null then raise exception 'Invalid action notification scope'; end if;
    update public.app_notifications n set read_at = timezone('utc', now())
    where n.user_id = v_user_id and n.type = 'chat' and n.read_at is null
      and n.payload ->> 'channelType' = 'action'
      and (p_action_id is null or n.payload ->> 'actionId' = p_action_id::text);
    get diagnostics v_updated_count = row_count; return v_updated_count;
  end if;
  if p_channel_type = 'dm' and (p_topic_id is not null or p_dm_peer_id is null) then raise exception 'A DM notification read requires a peer and no topic'; end if;
  if p_channel_type <> 'dm' and p_dm_peer_id is not null then raise exception 'A public chat notification read cannot include a peer'; end if;
  update public.app_notifications n set read_at = timezone('utc', now())
  where n.user_id = v_user_id and n.type = 'chat' and n.read_at is null and n.payload ->> 'channelType' = p_channel_type
    and ((p_channel_type = 'dm' and (n.payload ->> 'conversationPartnerId' = p_dm_peer_id or n.payload ->> 'recipientId' = p_dm_peer_id))
      or (p_channel_type <> 'dm' and nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id));
  get diagnostics v_updated_count = row_count; return v_updated_count;
end;
$$;

revoke all on function public.mark_my_chat_notifications_read(text, text, text, uuid) from public, anon;
grant execute on function public.mark_my_chat_notifications_read(text, text, text, uuid) to authenticated, service_role;
