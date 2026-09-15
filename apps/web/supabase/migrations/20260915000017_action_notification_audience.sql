-- Keep action-chat notifications on the lifecycle boundary without changing
-- the independent discussion access contract.
-- action_conversation_members is only a technical projection. The fan-out
-- below checks the current audience from the canonical source tables, so a
-- stale projection row cannot grant a notification.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'action_conversation_members'
      and constraint_name = 'action_conversation_members_access_source_check'
  ) then
    alter table public.action_conversation_members
      drop constraint action_conversation_members_access_source_check;
  end if;
end $$;

alter table public.action_conversation_members
  add constraint action_conversation_members_access_source_check
  check (
    access_source in (
      'owner',
      'action_participant',
      'organizer',
      'future_registration',
      'final_participant'
    )
  );

-- This is a notification-audience predicate, not an AuthZ predicate. It is
-- service-only because the source tables and the projection are server data.
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
  select
    a.created_by_clerk_id as user_id,
    'owner'::text as audience_source,
    10 as source_priority
  from action_context a
  join public.profiles p on p.id = a.created_by_clerk_id

  union all

  select
    ao.organizer_clerk_id as user_id,
    'organizer'::text as audience_source,
    20 as source_priority
  from action_context a
  join public.action_organizers ao on ao.action_id = a.id
  join public.profiles p on p.id = ao.organizer_clerk_id

  union all

  select
    ar.user_id,
    'future_registration'::text as audience_source,
    30 as source_priority
  from action_context a
  join public.action_registrations ar on ar.action_id = a.id
  join public.profiles p on p.id = ar.user_id
  where coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'
    and ar.registration_status in ('pending', 'confirmed')

  union all

  select
    ap.user_id,
    'final_participant'::text as audience_source,
    40 as source_priority
  from action_context a
  join public.action_participants ap on ap.action_id = a.id
  join public.profiles p on p.id = ap.user_id
  where coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
    and ap.participation_status = 'confirmed'
),
deduplicated_audience as (
  select distinct on (ca.user_id)
    ca.user_id,
    ca.audience_source
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

-- Upsert only the current projection. Historical rows are not deleted here;
-- fan-out always rechecks get_action_notification_audience instead.
create or replace function public.sync_action_conversation_notification_audience(
  p_action_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_conversation_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if not exists (
    select 1
    from public.get_action_notification_audience(p_action_id)
  ) then
    return null;
  end if;

  insert into public.action_conversations (action_id)
  values (p_action_id)
  on conflict (action_id) do update
    set updated_at = timezone('utc', now())
  returning id into v_conversation_id;

  insert into public.action_conversation_members (
    conversation_id,
    user_id,
    access_source
  )
  select
    v_conversation_id,
    audience.user_id,
    audience.audience_source
  from public.get_action_notification_audience(p_action_id) audience
  on conflict (conversation_id, user_id) do update
    set access_source = excluded.access_source;

  return v_conversation_id;
end;
$$;

revoke all on function public.sync_action_conversation_notification_audience(uuid)
  from public, anon, authenticated;
grant execute on function public.sync_action_conversation_notification_audience(uuid)
  to service_role;

-- Reconcile existing published actions once, without deleting historical
-- projection rows. Future source changes are handled by the triggers below.
do $$
declare
  v_action_id uuid;
begin
  for v_action_id in
    select a.id
    from public.actions a
    where a.published_at is not null
  loop
    perform public.sync_action_conversation_notification_audience(v_action_id);
  end loop;
end;
$$;

-- Keep the compatibility RPC as a projection operation. It no longer treats
-- final participation as an access requirement for Chat.
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
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  v_conversation_id := public.sync_action_conversation_notification_audience(p_action_id);
  if v_conversation_id is null then
    raise exception 'Action conversation unavailable';
  end if;

  if not exists (
    select 1
    from public.get_action_notification_audience(p_action_id) audience
    where audience.user_id = p_user_id
  ) then
    raise exception 'User is not in the current action notification audience';
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.ensure_action_conversation_member(uuid, text)
  from public, anon, authenticated;
grant execute on function public.ensure_action_conversation_member(uuid, text)
  to service_role;

create or replace function public.sync_action_conversation_notification_audience_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.sync_action_conversation_notification_audience(new.id);
  return new;
end;
$$;

create or replace function public.sync_action_conversation_notification_audience_on_action_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.sync_action_conversation_notification_audience(
    case when tg_op = 'DELETE' then old.action_id else new.action_id end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists actions_action_notification_audience_sync
  on public.actions;
create trigger actions_action_notification_audience_sync
after insert or update of action_phase, published_at, status, moderation_visibility
on public.actions
for each row execute function public.sync_action_conversation_notification_audience_on_action();

drop trigger if exists action_registrations_notification_audience_sync
  on public.action_registrations;
create trigger action_registrations_notification_audience_sync
after insert or update or delete on public.action_registrations
for each row execute function public.sync_action_conversation_notification_audience_on_action_source();

drop trigger if exists action_participants_notification_audience_sync
  on public.action_participants;
create trigger action_participants_notification_audience_sync
after insert or update or delete on public.action_participants
for each row execute function public.sync_action_conversation_notification_audience_on_action_source();

drop trigger if exists action_organizers_notification_audience_sync
  on public.action_organizers;
create trigger action_organizers_notification_audience_sync
after insert or update or delete on public.action_organizers
for each row execute function public.sync_action_conversation_notification_audience_on_action_source();

revoke all on function public.sync_action_conversation_notification_audience_on_action()
  from public, anon, authenticated;
revoke all on function public.sync_action_conversation_notification_audience_on_action_source()
  from public, anon, authenticated;
grant execute on function public.sync_action_conversation_notification_audience_on_action()
  to service_role;
grant execute on function public.sync_action_conversation_notification_audience_on_action_source()
  to service_role;

-- Rebuild only the action branch of the canonical fan-out with the current
-- audience. Other channel contracts remain unchanged.
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

revoke all on function public.create_chat_notifications_for_message(uuid)
  from public, anon, authenticated;
grant execute on function public.create_chat_notifications_for_message(uuid)
  to service_role;
