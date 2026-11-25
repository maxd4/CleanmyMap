-- CANDIDATE: forward-only migration, not applied. Validate against current schema.
alter table public.app_messages
  add column spogomi_event_id uuid references public.spogomi_events(id) on delete restrict,
  add column spogomi_room text;
alter table public.app_messages drop constraint app_messages_channel_type_check;
alter table public.app_messages add constraint app_messages_channel_type_check
  check (channel_type in ('community','dm','admin_elu','territory','bug_report','action','spogomi_event'));
alter table public.app_messages add constraint app_messages_spogomi_scope_check
  check ((channel_type = 'spogomi_event' and spogomi_event_id is not null
          and spogomi_room is not null and spogomi_room in ('general','coordination','teams')
          and topic_id is null and recipient_id is null and conversation_id is null)
      or (channel_type <> 'spogomi_event' and spogomi_event_id is null and spogomi_room is null));
create index app_messages_spogomi_room_cursor_idx
  on public.app_messages(spogomi_event_id, spogomi_room, created_at desc, id desc)
  where channel_type = 'spogomi_event';

-- The existing permissive policies remain intact. New rooms are server-only;
-- old global messages are retained as an archive, never attributed to an event.
create policy app_messages_exclude_spogomi_direct
  on public.app_messages as restrictive for all to anon, authenticated
  using (channel_type <> 'spogomi_event' and not (channel_type = 'community' and topic_id is not distinct from 'spogomi'))
  with check (channel_type <> 'spogomi_event' and not (channel_type = 'community' and topic_id is not distinct from 'spogomi'));

create function public.reject_legacy_spogomi_chat_insert() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if new.channel_type = 'community' and new.topic_id = 'spogomi' then
    raise exception 'Legacy SPOGOMI room is closed';
  end if;
  return new;
end;
$$;
revoke all on function public.reject_legacy_spogomi_chat_insert() from public, anon, authenticated;
create trigger reject_legacy_spogomi_chat_insert before insert on public.app_messages
  for each row execute function public.reject_legacy_spogomi_chat_insert();

create function public.spogomi_chat_event_for_server(p_actor text, p_event uuid)
returns jsonb language sql stable security invoker set search_path = pg_catalog as $$
  select jsonb_build_object('id', e.id, 'name', e.name, 'state', e.state, 'startsAt', e.starts_at)
  from public.spogomi_events e
  where e.id = p_event and e.state <> 'draft'
    and exists (select 1 from public.spogomi_participants p where p.event_id = e.id
      and p.clerk_id = p_actor and p.account_link_status = 'verified'
      and p.registration_status = 'registered');
$$;

create function public.list_spogomi_chat_events_for_server(p_actor text, p_after uuid default null)
returns jsonb language sql stable security invoker set search_path = pg_catalog as $$
  with eligible as (
    select e.id, e.name, e.state, e.starts_at
    from public.spogomi_events e
    where e.state <> 'draft' and (p_after is null or e.id > p_after)
      and exists (select 1 from public.spogomi_participants p where p.event_id = e.id
        and p.clerk_id = p_actor and p.account_link_status = 'verified'
        and p.registration_status = 'registered')
    order by e.id limit 51
  ), page as (select * from eligible order by id limit 50)
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name,
      'state', state, 'startsAt', starts_at) order by id) from page), '[]'::jsonb),
    'nextCursor', case when (select count(*) from eligible) > 50
      then (select id from page order by id desc limit 1) else null end);
$$;

create function public.read_spogomi_chat_room_for_server(
  p_actor text, p_event uuid, p_room text,
  p_before_at timestamptz default null, p_before_id uuid default null, p_query text default null)
returns jsonb language sql stable security invoker set search_path = pg_catalog as $$
  with eligible as (select public.spogomi_chat_event_for_server(p_actor, p_event) as event),
  found as (
    select m.id, m.sender_id, m.content, m.created_at,
      coalesce(nullif(p.display_name, ''), nullif(p.handle, ''), 'Participant') as sender_name
    from public.app_messages m left join public.public_profiles p on p.id = m.sender_id
    where (select event from eligible) is not null
      and p_room in ('general','coordination','teams')
      and m.channel_type = 'spogomi_event' and m.spogomi_event_id = p_event and m.spogomi_room = p_room
      and ((p_before_at is null and p_before_id is null)
        or (m.created_at, m.id) < (p_before_at, p_before_id))
      and (p_query is null or position(lower(p_query) in lower(m.content)) > 0)
    order by m.created_at desc, m.id desc limit 51
  ), page as (select * from found order by created_at desc, id desc limit 50)
  select case when (select event from eligible) is null or p_room not in ('general','coordination','teams')
    then null else jsonb_build_object('event', (select event from eligible),
      'messages', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'senderId', sender_id,
        'senderName', sender_name, 'content', content, 'createdAt', created_at) order by created_at, id) from page), '[]'::jsonb),
      'nextCursor', case when (select count(*) from found) > 50 then
        (select jsonb_build_object('createdAt', created_at, 'id', id) from page order by created_at, id limit 1)
        else null end) end;
$$;

create function public.send_spogomi_chat_message_for_server(p_actor text, p_event uuid, p_room text, p_content text)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_id uuid;
begin
  if p_room is null or p_room not in ('general','coordination','teams') or p_content is null
    or char_length(btrim(p_content)) not between 1 and 2000 then return null; end if;
  -- Lock both canonical records before the write, so withdrawal/state change
  -- and sending serialize. Never accept an actor id from the browser.
  perform 1 from public.spogomi_events e where e.id = p_event
    and e.state not in ('draft','cancelled','archived') for share;
  if not found then return null; end if;
  perform 1 from public.spogomi_participants p where p.event_id = p_event and p.clerk_id = p_actor
    and p.account_link_status = 'verified' and p.registration_status = 'registered'
    order by p.id limit 1 for share;
  if not found then return null; end if;
  insert into public.app_messages(sender_id, channel_type, spogomi_event_id, spogomi_room, content)
    values(p_actor, 'spogomi_event', p_event, p_room, btrim(p_content)) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.spogomi_chat_event_for_server(text,uuid) from public, anon, authenticated;
revoke all on function public.list_spogomi_chat_events_for_server(text,uuid) from public, anon, authenticated;
revoke all on function public.read_spogomi_chat_room_for_server(text,uuid,text,timestamptz,uuid,text) from public, anon, authenticated;
revoke all on function public.send_spogomi_chat_message_for_server(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.spogomi_chat_event_for_server(text,uuid) to service_role;
grant execute on function public.list_spogomi_chat_events_for_server(text,uuid) to service_role;
grant execute on function public.read_spogomi_chat_room_for_server(text,uuid,text,timestamptz,uuid,text) to service_role;
grant execute on function public.send_spogomi_chat_message_for_server(text,uuid,text,text) to service_role;
