-- Complete the action discussion contract for future and completed actions.
-- Access is granted by the action owner/organizers, ACTIVE_ROLE administrators, or a
-- confirmed participation in the store for the current action phase.

-- Clerk GRANTED_ROLE remains in role_label. ACTIVE_ROLE is projected separately
-- by the canonical Clerk -> Supabase sync because the Clerk JWT forwarded to
-- RLS does not expose a configured active-role claim.
alter table public.profiles
  add column if not exists active_role_label text;

do $$
begin
  alter table public.profiles
    add constraint profiles_active_role_label_check
    check (active_role_label is null or active_role_label in (
      'benevole', 'coordinateur', 'scientifique', 'entreprise', 'elu', 'admin', 'max'
    ));
exception
  when duplicate_object then null;
end $$;

create or replace function public.current_profile_active_role()
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select active_role_label
  from public.profiles
  where id = coalesce(auth.jwt() ->> 'sub', '')
  limit 1
$$;

revoke all on function public.current_profile_active_role() from public;
grant execute on function public.current_profile_active_role() to authenticated, service_role;

create or replace function private.can_view_action_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.action_conversations c
    join public.actions a on a.id = c.action_id
    where c.id = p_conversation_id
      and public.is_action_discussion_available(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
      and (select auth.role()) = 'authenticated'
      and (select auth.jwt()) ->> 'sub' is not null
      and not exists (
        select 1
        from public.action_conversation_exclusions e
        where e.conversation_id = c.id
          and e.user_id = (select auth.jwt()) ->> 'sub'
          and e.active
      )
      and (
        public.current_profile_active_role() in ('admin', 'max')
        or a.created_by_clerk_id = (select auth.jwt()) ->> 'sub'
        or exists (
          select 1
          from public.action_organizers ao
          where ao.action_id = a.id
            and ao.organizer_clerk_id = (select auth.jwt()) ->> 'sub'
        )
        or (
          coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
          and exists (
            select 1
            from public.action_registrations ar
            where ar.action_id = a.id
              and ar.user_id = (select auth.jwt()) ->> 'sub'
              and ar.registration_status = 'confirmed'
          )
        )
        or (
          coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
          and exists (
            select 1
            from public.action_participants ap
            where ap.action_id = a.id
              and ap.user_id = (select auth.jwt()) ->> 'sub'
              and ap.participation_status = 'confirmed'
          )
        )
      )
  );
$$;

-- Keep the existing cancellation rule: cancelled discussions remain readable
-- to their authorized audience but never accept new messages.
create or replace function private.can_post_action_conversation(
  p_conversation_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select private.can_view_action_conversation(p_conversation_id)
    and not exists (
      select 1
      from public.action_conversations c
      join public.actions a on a.id = c.action_id
      where c.id = p_conversation_id
        and a.status = 'cancelled'
    );
$$;

revoke all on function private.can_view_action_conversation(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_post_action_conversation(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_view_action_conversation(uuid)
  to authenticated;
grant execute on function private.can_post_action_conversation(uuid)
  to authenticated;

-- The historical audience function kept pending registrations for the older
-- chat projection. The current action-discussion fan-out only targets users
-- who can already participate in the current phase.
create or replace function public.get_action_notification_audience(
  p_action_id uuid
)
returns table (
  user_id text,
  audience_source text
)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
with action_context as (
  select a.*
  from public.actions a
  where a.id = p_action_id
    and public.is_action_discussion_available(
      a.action_phase,
      a.published_at,
      a.moderation_visibility,
      a.status,
      a.action_date,
      a.event_start_time
    )
),
candidate_audience as (
  select a.created_by_clerk_id as user_id, 'owner'::text as audience_source, 10 as source_priority
  from action_context a
  join public.profiles p on p.id = a.created_by_clerk_id

  union all

  select ao.organizer_clerk_id as user_id, 'organizer'::text as audience_source, 20 as source_priority
  from action_context a
  join public.action_organizers ao on ao.action_id = a.id
  join public.profiles p on p.id = ao.organizer_clerk_id

  union all

  select ar.user_id, 'future_registration'::text as audience_source, 30 as source_priority
  from action_context a
  join public.action_registrations ar on ar.action_id = a.id
  join public.profiles p on p.id = ar.user_id
  where coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'
    and ar.registration_status = 'confirmed'

  union all

  select ap.user_id, 'final_participant'::text as audience_source, 40 as source_priority
  from action_context a
  join public.action_participants ap on ap.action_id = a.id
  join public.profiles p on p.id = ap.user_id
  where coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
    and ap.participation_status = 'confirmed'
),
deduplicated_audience as (
  select distinct on (ca.user_id) ca.user_id, ca.audience_source
  from candidate_audience ca
  where nullif(btrim(ca.user_id), '') is not null
  order by ca.user_id, ca.source_priority
)
select da.user_id, da.audience_source
from deduplicated_audience da;
$$;

revoke all on function public.get_action_notification_audience(uuid)
  from public, anon, authenticated;
grant execute on function public.get_action_notification_audience(uuid)
  to service_role;

-- Action discussion notifications are a first-class app notification type.
do $$
begin
  alter table public.app_notifications
    drop constraint if exists app_notifications_type_check;
  alter table public.app_notifications
    add constraint app_notifications_type_check
    check (type in ('validation', 'community', 'system', 'security', 'chat', 'action_discussion'));
end $$;

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
    m.action_id, c.action_id as conversation_action_id,
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

  if v_message.channel_type = 'community' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select p.id, 'chat', 'Nouveau message dans Communauté globale', v_content_summary
      , v_base_payload
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

create or replace function public.get_my_unread_chat_notification_counts()
returns table (channel_type text, topic_id text, unread_count bigint)
language sql security invoker set search_path = pg_catalog
as $$
  select n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), ''), count(*)::bigint
  from public.app_notifications n
  where n.user_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and n.type in ('chat', 'action_discussion')
    and n.read_at is null
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
    where n.user_id = v_user_id and n.type in ('chat', 'action_discussion') and n.read_at is null
      and n.payload ->> 'channelType' = 'action'
      and (p_action_id is null or n.payload ->> 'actionId' = p_action_id::text);
    get diagnostics v_updated_count = row_count; return v_updated_count;
  end if;
  if p_channel_type = 'dm' and (p_topic_id is not null or p_dm_peer_id is null) then raise exception 'A DM notification read requires a peer and no topic'; end if;
  if p_channel_type <> 'dm' and p_dm_peer_id is not null then raise exception 'A public chat notification read cannot include a peer'; end if;
  update public.app_notifications n set read_at = timezone('utc', now())
  where n.user_id = v_user_id and n.type in ('chat', 'action_discussion') and n.read_at is null and n.payload ->> 'channelType' = p_channel_type
    and ((p_channel_type = 'dm' and (n.payload ->> 'conversationPartnerId' = p_dm_peer_id or n.payload ->> 'recipientId' = p_dm_peer_id))
      or (p_channel_type <> 'dm' and nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id));
  get diagnostics v_updated_count = row_count; return v_updated_count;
end;
$$;

revoke all on function public.get_my_unread_chat_notification_counts() from public, anon;
grant execute on function public.get_my_unread_chat_notification_counts() to authenticated, service_role;
revoke all on function public.mark_my_chat_notifications_read(text, text, text, uuid) from public, anon;
grant execute on function public.mark_my_chat_notifications_read(text, text, text, uuid) to authenticated, service_role;
