-- External action shares are lightweight references on the canonical message.
-- The action row remains the only source of truth for the rendered card.
alter table public.app_messages
  add column if not exists action_id uuid references public.actions(id) on delete set null;

-- Keep the identifier when the action is deleted so the message can render a
-- neutral unavailable-card fallback. The server-side share check prevents
-- creating a reference to an action that was not shareable at send time.
alter table public.app_messages
  drop constraint if exists app_messages_action_id_fkey;

alter table public.app_messages
  drop constraint if exists app_messages_action_message_reference_check;

alter table public.app_messages
  add constraint app_messages_action_message_reference_check
  check (
    action_id is null
    or (
      channel_type in ('community', 'territory', 'dm')
      and message_kind = 'message'
      and conversation_id is null
      and topic_id is null
      and related_event_id is null
      and attachment_url is null
      and attachment_type is null
    )
  );

create index if not exists app_messages_action_id_created_at_idx
  on public.app_messages (action_id, created_at desc, id desc)
  where action_id is not null;

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
      and a.published_at is not null
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and a.action_phase = 'pre_action'
      and a.status in ('pending', 'approved')
      and (
        a.action_date > current_date
        or (
          a.action_date = current_date
          and a.event_start_time is not null
          and a.event_start_time > (current_time at time zone 'Europe/Paris')::time
        )
      )
  );
$$;

revoke all on function public.can_insert_action_message_reference(uuid) from public, anon;
grant execute on function public.can_insert_action_message_reference(uuid) to authenticated, service_role;

-- Keep direct RLS writes aligned with the API contract: a reference can only
-- point to a currently published future pre-action.
drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
with check (
  (action_id is null or public.can_insert_action_message_reference(action_id))
  and (
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
  )
);

-- Preserve the normal notification fan-out while carrying the same lightweight
-- reference. Internal action-channel messages still use their conversation's
-- action id; external shares use app_messages.action_id.
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
    m.zone_name, m.arrondissement_id, m.content, m.conversation_id,
    m.action_id, c.action_id as conversation_action_id
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
    'actionId', coalesce(v_message.action_id, v_message.conversation_action_id)
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
