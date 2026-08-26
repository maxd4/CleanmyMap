-- Lot Messagerie 5A: keep app_notifications as the canonical notification
-- read state while carrying the real chat destination and message contract.

create or replace function public.create_chat_notifications_for_message(
  p_message_id uuid
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
  select
    m.id,
    m.sender_id,
    m.recipient_id,
    m.channel_type,
    m.topic_id,
    m.message_kind,
    m.zone_name,
    m.arrondissement_id,
    m.content
  into v_message
  from public.app_messages m
  where m.id = p_message_id;

  if not found then
    raise exception 'Message not found';
  end if;

  if v_message.sender_id <> coalesce((select auth.jwt()) ->> 'sub', '') then
    raise exception 'Forbidden';
  end if;

  select
    coalesce(nullif(trim(display_name), ''), nullif(trim(handle), ''), 'Membre'),
    nullif(trim(handle), '')
  into v_sender_label, v_sender_handle
  from public.profiles
  where id = v_message.sender_id;

  v_content_summary := btrim(regexp_replace(coalesce(v_message.content, ''), '\s+', ' ', 'g'));
  if char_length(v_content_summary) > 120 then
    v_content_summary := left(v_content_summary, 117) || '...';
  end if;

  v_base_payload := jsonb_strip_nulls(
    jsonb_build_object(
      'channelType', v_message.channel_type,
      'messageId', v_message.id,
      'topicId', v_message.topic_id,
      'messageKind', v_message.message_kind
    )
  );

  if v_message.channel_type = 'dm' and v_message.recipient_id is not null and v_message.recipient_id <> v_message.sender_id then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      v_message.recipient_id,
      'chat',
      'Message privé de ' || coalesce(v_sender_label, 'Membre'),
      v_content_summary,
      v_base_payload || jsonb_strip_nulls(
        jsonb_build_object(
          'conversationPartnerId', v_message.sender_id,
          'conversationPartnerLabel', v_sender_label,
          'conversationPartnerHandle', v_sender_handle,
          'recipientId', v_message.sender_id,
          'recipientLabel', v_sender_label,
          'recipientHandle', v_sender_handle
        )
      )
    where not exists (
      select 1
      from public.app_notifications n
      where n.user_id = v_message.recipient_id
        and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
        and coalesce(n.payload ->> 'channelType', '') = 'dm'
    );
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'bug_report' and v_message.recipient_id is not null then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      v_message.recipient_id,
      'chat',
      'Nouveau feedback reçu',
      v_content_summary,
      v_base_payload
    where not exists (
      select 1
      from public.app_notifications n
      where n.user_id = v_message.recipient_id
        and n.type = 'chat'
        and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
        and coalesce(n.payload ->> 'channelType', '') = 'bug_report'
    );
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'community' then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      p.id,
      'chat',
      'Nouveau message dans Communauté globale',
      v_content_summary,
      v_base_payload
    from public.profiles p
    where p.id <> v_message.sender_id
      and not exists (
        select 1
        from public.app_notifications n
        where n.user_id = p.id
          and n.type = 'chat'
          and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
          and coalesce(n.payload ->> 'channelType', '') = 'community'
      )
    limit 250;
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'admin_elu' then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload
    )
    select
      p.id,
      'chat',
      'Nouveau message dans Admin & élus',
      v_content_summary,
      v_base_payload
    from public.profiles p
    where p.id <> v_message.sender_id
      and p.role_label in ('admin', 'max', 'elu')
      and not exists (
        select 1
        from public.app_notifications n
        where n.user_id = p.id
          and n.type = 'chat'
          and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
          and coalesce(n.payload ->> 'channelType', '') = 'admin_elu'
      )
    limit 100;
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'territory' then
    if v_message.arrondissement_id is not null then
      insert into public.app_notifications (
        user_id,
        type,
        title,
        content,
        payload
      )
      select
        p.id,
        'chat',
        'Nouveau message dans Territoire & limitrophes',
        v_content_summary,
        v_base_payload || jsonb_strip_nulls(
          jsonb_build_object(
            'zoneName', v_message.zone_name,
            'arrondissementId', v_message.arrondissement_id
          )
        )
      from public.profiles p
      where p.id <> v_message.sender_id
        and public.can_profile_view_territory_message(p.id, v_message.arrondissement_id)
        and not exists (
          select 1
          from public.app_notifications n
          where n.user_id = p.id
            and n.type = 'chat'
            and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
            and coalesce(n.payload ->> 'channelType', '') = 'territory'
        );
      get diagnostics v_inserted_count = row_count;
      return v_inserted_count;
    end if;

    if v_message.zone_name is not null then
      insert into public.app_notifications (
        user_id,
        type,
        title,
        content,
        payload
      )
      select
        p.id,
        'chat',
        'Nouveau message dans Territoire & limitrophes',
        v_content_summary,
        v_base_payload || jsonb_strip_nulls(
          jsonb_build_object('zoneName', v_message.zone_name)
        )
      from public.profiles p
      where p.id <> v_message.sender_id
        and lower(coalesce(p.metadata ->> 'zoneName', '')) = lower(v_message.zone_name)
        and not exists (
          select 1
          from public.app_notifications n
          where n.user_id = p.id
            and n.type = 'chat'
            and coalesce(n.payload ->> 'messageId', '') = v_message.id::text
            and coalesce(n.payload ->> 'channelType', '') = 'territory'
        );
      get diagnostics v_inserted_count = row_count;
      return v_inserted_count;
    end if;
  end if;

  return 0;
end;
$$;

revoke all on function public.create_chat_notifications_for_message(uuid) from public;
grant execute on function public.create_chat_notifications_for_message(uuid) to service_role;

create or replace function public.get_my_unread_chat_notification_counts()
returns table (
  channel_type text,
  topic_id text,
  unread_count bigint
)
language sql
security invoker
set search_path = pg_catalog
as $$
  select
    n.payload ->> 'channelType' as channel_type,
    nullif(btrim(n.payload ->> 'topicId'), '') as topic_id,
    count(*)::bigint as unread_count
  from public.app_notifications n
  where n.user_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and n.type = 'chat'
    and n.read_at is null
    and n.payload ->> 'channelType' in ('community', 'territory', 'dm')
  group by n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), '');
$$;

revoke all on function public.get_my_unread_chat_notification_counts() from public, anon;
grant execute on function public.get_my_unread_chat_notification_counts() to authenticated, service_role;

create or replace function public.mark_my_chat_notifications_read(
  p_channel_type text,
  p_topic_id text default null,
  p_dm_peer_id text default null
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_id text;
  v_updated_count integer := 0;
begin
  v_user_id := nullif(btrim(coalesce((select auth.jwt()) ->> 'sub', '')), '');
  if v_user_id is null then
    raise exception 'Unauthenticated';
  end if;

  p_channel_type := nullif(btrim(p_channel_type), '');
  p_topic_id := nullif(btrim(p_topic_id), '');
  p_dm_peer_id := nullif(btrim(p_dm_peer_id), '');

  if p_channel_type not in ('community', 'territory', 'dm') then
    raise exception 'Unsupported chat notification channel';
  end if;

  if p_channel_type = 'dm' and (p_topic_id is not null or p_dm_peer_id is null) then
    raise exception 'A DM notification read requires a peer and no topic';
  end if;

  if p_channel_type <> 'dm' and p_dm_peer_id is not null then
    raise exception 'A public chat notification read cannot include a peer';
  end if;

  if p_topic_id is not null and not (
    (p_channel_type = 'community' and p_topic_id in (
      'relais_associatif',
      'appel_aux_benevoles',
      'demande_diffusion',
      'besoin_ressources',
      'coordination_secteur'
    ))
    or
    (p_channel_type = 'territory' and p_topic_id in (
      'mon_territoire',
      'territoires_voisins'
    ))
  ) then
    raise exception 'Unsupported chat notification topic';
  end if;

  update public.app_notifications n
  set read_at = timezone('utc'::text, now())
  where n.user_id = v_user_id
    and n.type = 'chat'
    and n.read_at is null
    and n.payload ->> 'channelType' = p_channel_type
    and (
      (
        p_channel_type = 'dm'
        and (
          n.payload ->> 'conversationPartnerId' = p_dm_peer_id
          or n.payload ->> 'recipientId' = p_dm_peer_id
        )
      )
      or
      (
        p_channel_type <> 'dm'
        and nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id
      )
    );
  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.mark_my_chat_notifications_read(text, text, text) from public, anon;
grant execute on function public.mark_my_chat_notifications_read(text, text, text) to authenticated, service_role;
