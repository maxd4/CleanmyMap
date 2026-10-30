-- Publish one official community announcement for each approved association action.
-- CALLER: the authenticated admin route invokes the server-only diffusion command
-- after the review RPC has committed the approved/public action.
-- AUTHORIZATION_BOUNDARY: authenticated RLS writes explicitly reject the
-- official topic; service_role is the only insertion path for this marker.
-- IDEMPOTENCY: a partial unique index makes the action identity the durable key;
-- notification fan-out de-duplicates on the same action identity.
-- FAILURE_BEHAVIOR: the review decision is not rolled back when message or
-- notification fan-out fails; the server route records the partial outcome and
-- an explicit retry revalidates the current public action.
-- FORWARD_ONLY: no historical app_messages or community_events rows are changed.

alter table public.app_messages
  add column if not exists official_action_publication_id uuid
    references public.actions(id) on delete cascade;

alter table public.app_messages
  drop constraint if exists app_messages_topic_channel_check;

alter table public.app_messages
  add constraint app_messages_topic_channel_check
  check (
    topic_id is null
    or (
      channel_type = 'community'
      and topic_id in (
        'relais_associatif',
        'appel_aux_benevoles',
        'demande_diffusion',
        'besoin_ressources',
        'coordination_secteur',
        'spogomi',
        'evenements_associatifs'
      )
    )
    or (
      channel_type = 'admin_elu'
      and topic_id in (
        'arbitrages',
        'priorites',
        'suivi_decisions',
        'coordination_institutionnelle'
      )
    )
    or (
      channel_type = 'territory'
      and topic_id in ('mon_territoire', 'territoires_voisins')
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_announcement_channel_check;

alter table public.app_messages
  add constraint app_messages_announcement_channel_check
  check (
    message_kind = 'message'
    or (
      message_kind = 'announcement'
      and channel_type = 'community'
      and topic_id in (
        'relais_associatif',
        'appel_aux_benevoles',
        'demande_diffusion',
        'evenements_associatifs'
      )
    )
    or (
      message_kind = 'poll'
      and channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_official_action_publication_check;

alter table public.app_messages
  add constraint app_messages_official_action_publication_check
  check (
    official_action_publication_id is null
    or (
      message_kind = 'announcement'
      and channel_type = 'community'
      and topic_id = 'evenements_associatifs'
      and action_id = official_action_publication_id
      and related_event_id is null
    )
  );

create unique index if not exists idx_app_messages_official_action_publication
  on public.app_messages(official_action_publication_id)
  where official_action_publication_id is not null;

-- Keep direct authenticated writes compatible with manual announcements while
-- making the official publication topic server-only.
drop policy if exists app_messages_insert_channels on public.app_messages;
create policy app_messages_insert_channels
on public.app_messages
for insert
to authenticated
with check (
  (action_id is null or private.can_insert_action_message_reference(action_id))
  and not (
    message_kind = 'announcement'
    and topic_id = 'evenements_associatifs'
  )
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
      channel_type = 'territory'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and arrondissement_id is not null
      and recipient_id is null
    )
    or (
      channel_type = 'bug_report'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and recipient_id is not null
      and private.is_profile_admin(recipient_id)
      and arrondissement_id is null
    )
    or (
      channel_type = 'action'
      and sender_id = coalesce((select auth.jwt()) ->> 'sub', '')
      and conversation_id is not null
      and private.can_post_action_conversation(conversation_id)
    )
  )
);

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
    m.action_id, m.official_action_publication_id, c.action_id as conversation_action_id,
    a.action_phase as conversation_action_phase, a.location_label as conversation_location_label
  into v_message
  from public.app_messages m
  left join public.action_conversations c on c.id = m.conversation_id
  left join public.actions a on a.id = coalesce(m.action_id, c.action_id)
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
    'actionId', coalesce(v_message.action_id, v_message.conversation_action_id),
    'commentId', case when v_message.channel_type = 'action' then v_message.id end,
    'actionPhase', case when v_message.channel_type = 'action'
      then coalesce(v_message.conversation_action_phase, 'post_action_complete') end
  ));

  if v_message.channel_type = 'action' and v_message.conversation_id is not null then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select audience.user_id,
      'action_discussion',
      'Nouveau message — ' || coalesce(nullif(btrim(v_message.conversation_location_label), ''), 'Discussion de l’action'),
      v_content_summary,
      v_base_payload
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
        where n.user_id = audience.user_id and n.type in ('chat', 'action_discussion')
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

  if v_message.channel_type = 'community' and v_message.official_action_publication_id is not null then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id,
      'community',
      'Nouvelle action associative publiée',
      v_content_summary,
      v_base_payload || jsonb_build_object(
        'sourceType', 'association_action_publication',
        'sourceId', v_message.official_action_publication_id,
        'actionId', v_message.official_action_publication_id,
        'href', '/sections/rejoindre-une-action?actionId=' || v_message.official_action_publication_id::text
      )
    from public.profiles p
    where p.id <> v_message.sender_id
      and not exists (
        select 1 from public.app_notifications n
        where n.user_id = p.id
          and n.type = 'community'
          and n.payload ->> 'sourceType' = 'association_action_publication'
          and n.payload ->> 'sourceId' = v_message.official_action_publication_id::text
      )
    limit 250;
    get diagnostics v_inserted_count = row_count;
    return v_inserted_count;
  end if;

  if v_message.channel_type = 'community' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id, 'chat', 'Nouveau message dans Communauté globale', v_content_summary,
      v_base_payload
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
  p_topic_id := nullif(btrim(p_topic_id), '');
  if p_channel_type not in ('community', 'territory', 'admin_elu', 'dm', 'action') then raise exception 'Unsupported chat notification channel'; end if;
  if p_channel_type = 'action' then
    if p_topic_id is not null or p_dm_peer_id is not null then raise exception 'Invalid action notification scope'; end if;
    update public.app_notifications n set read_at = timezone('utc', now())
    where n.user_id = v_user_id and n.type in ('chat', 'action_discussion') and n.read_at is null
      and n.payload ->> 'channelType' = 'action'
      and (p_action_id is null or n.payload ->> 'actionId' = p_action_id::text);
    get diagnostics v_updated_count = row_count; return v_updated_count;
  end if;
  if p_channel_type = 'dm' and (p_topic_id is not null or p_dm_peer_id is null) then raise exception 'A DM notification read requires a peer and no topic'; end if;
  if p_channel_type <> 'dm' and p_dm_peer_id is not null then raise exception 'A public chat notification read cannot include a peer'; end if;
  if p_topic_id is not null and not (
    (p_channel_type = 'community' and p_topic_id in ('relais_associatif', 'appel_aux_benevoles', 'demande_diffusion', 'besoin_ressources', 'coordination_secteur', 'spogomi', 'evenements_associatifs'))
    or (p_channel_type = 'territory' and p_topic_id in ('mon_territoire', 'territoires_voisins'))
    or (p_channel_type = 'admin_elu' and p_topic_id in ('arbitrages', 'priorites', 'suivi_decisions', 'coordination_institutionnelle'))
  ) then raise exception 'Unsupported chat notification topic'; end if;
  update public.app_notifications n set read_at = timezone('utc', now())
  where n.user_id = v_user_id and n.type in ('chat', 'action_discussion') and n.read_at is null
    and n.payload ->> 'channelType' = p_channel_type
    and ((p_channel_type = 'dm' and (n.payload ->> 'conversationPartnerId' = p_dm_peer_id or n.payload ->> 'recipientId' = p_dm_peer_id))
      or (p_channel_type <> 'dm' and nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id));
  get diagnostics v_updated_count = row_count; return v_updated_count;
end;
$$;

revoke all on function public.mark_my_chat_notifications_read(text, text, text, uuid) from public, anon;
grant execute on function public.mark_my_chat_notifications_read(text, text, text, uuid) to authenticated, service_role;
