-- Align the chat notification fan-out with the server-only caller contract.
-- The actor is supplied by the authenticated server route, never by the browser.

drop function if exists public.create_chat_notifications_for_message(uuid);

create or replace function public.create_chat_notifications_for_message(
  p_message_id uuid,
  p_actor_user_id text
)
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
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select m.id, m.sender_id, m.recipient_id, m.channel_type, m.topic_id, m.message_kind,
    m.zone_name, m.arrondissement_id, m.content, m.conversation_id,
    m.action_id, c.action_id as conversation_action_id
  into v_message
  from public.app_messages m
  left join public.action_conversations c on c.id = m.conversation_id
  where m.id = p_message_id;
  if not found then raise exception 'Message not found'; end if;
  if p_actor_user_id is null or v_message.sender_id <> p_actor_user_id then
    raise exception 'Forbidden';
  end if;

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
    select audience.user_id, 'chat', 'Nouveau message dans l’action', v_content_summary, v_base_payload
    from public.get_action_notification_audience(v_message.conversation_action_id) audience
    where audience.user_id <> v_message.sender_id
      and not exists (
        select 1 from public.action_conversation_exclusions e
        where e.conversation_id = v_message.conversation_id
          and e.user_id = audience.user_id
          and e.active
      )
      and not exists (
        select 1 from public.app_notifications n
        where n.user_id = audience.user_id and n.type = 'chat'
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

revoke all on function public.create_chat_notifications_for_message(uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_chat_notifications_for_message(uuid, text)
  to service_role;
