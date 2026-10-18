-- CHAT-04: message and poll creation is a server-owned, quota-checked flow.
-- Reads and poll votes keep their existing RLS contracts.

-- The Clerk-authenticated POST /api/chat route is the only message creation
-- boundary. Its server-side sequence is: Clerk identity, payload validation,
-- action/channel/conversation/destination authorization, canonical quota
-- reservation, then service_role persistence. RLS remains a read/vote guard;
-- it is not a substitute for the application quota or channel contract.
revoke insert on table public.app_messages from public, anon, authenticated;
grant select on table public.app_messages to authenticated;
grant all privileges on table public.app_messages to service_role;

-- Poll options are created atomically with their parent by the server RPC.
-- Direct option inserts would otherwise be a second survey-creation surface.
revoke insert on table public.chat_poll_options from public, anon, authenticated;
grant select on table public.chat_poll_options to authenticated;
grant select, insert on table public.chat_poll_options to service_role;

-- The previous invoker RPC is not a client write path anymore. Remove its
-- execute surface entirely, including service_role, so callers cannot use it
-- as a quota-free alternative to the server boundary.
revoke all on function public.create_chat_poll_with_options(
  text, text, text, jsonb, text, uuid, integer, text
) from public, anon, authenticated, service_role;

-- The historical admin-only server overload is superseded by the explicit
-- all-channel function below. Keep its definition for migration compatibility
-- but close its execute surface so it cannot become a second write route.
revoke all on function public.create_chat_poll_with_options_for_server(
  text, text, text, jsonb
) from public, anon, authenticated, service_role;

-- Server-only atomic poll creation. The caller must have already performed
-- Clerk AuthN/AuthZ and reserveDiscussionMessageSlot; this function is a
-- persistence primitive, not an authorization or quota implementation.
create or replace function public.create_chat_poll_with_options_for_server(
  p_actor_user_id text,
  p_channel_type text,
  p_content text,
  p_topic_id text,
  p_option_labels jsonb,
  p_recipient_id text,
  p_conversation_id uuid,
  p_arrondissement_id integer,
  p_zone_name text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_message_id uuid;
  v_option jsonb;
  v_position smallint := 0;
  v_label text;
  v_labels text[] := array[]::text[];
begin
  if (select auth.role()) <> 'service_role'
    or nullif(btrim(p_actor_user_id), '') is null
  then
    raise exception 'server authorization required';
  end if;

  if p_channel_type not in ('community', 'admin_elu', 'territory', 'action', 'dm') then
    raise exception 'poll channel is invalid';
  end if;

  if p_content is null or char_length(btrim(p_content)) = 0 or char_length(p_content) > 2000 then
    raise exception 'poll question is invalid';
  end if;

  if p_option_labels is null or jsonb_typeof(p_option_labels) <> 'array'
     or jsonb_array_length(p_option_labels) < 2
     or jsonb_array_length(p_option_labels) > 6 then
    raise exception 'poll requires between 2 and 6 options';
  end if;

  if p_channel_type in ('community', 'admin_elu')
     and (nullif(btrim(p_recipient_id), '') is not null
       or p_conversation_id is not null
       or p_arrondissement_id is not null
       or nullif(btrim(p_zone_name), '') is not null) then
    raise exception 'poll context is invalid';
  end if;

  if p_channel_type = 'dm'
     and (nullif(btrim(p_recipient_id), '') is null
       or btrim(p_recipient_id) = btrim(p_actor_user_id)
       or p_conversation_id is not null
       or p_arrondissement_id is not null
       or nullif(btrim(p_zone_name), '') is not null) then
    raise exception 'poll direct-message context is invalid';
  end if;

  if p_channel_type = 'territory'
     and (nullif(btrim(p_recipient_id), '') is not null
       or p_conversation_id is not null
       or p_arrondissement_id is null) then
    raise exception 'poll territory context is invalid';
  end if;

  if p_channel_type = 'action'
     and (nullif(btrim(p_recipient_id), '') is not null
       or p_conversation_id is null
       or p_arrondissement_id is not null
       or nullif(btrim(p_zone_name), '') is not null) then
    raise exception 'poll action context is invalid';
  end if;

  for v_option in
    select value from jsonb_array_elements(p_option_labels)
  loop
    v_position := v_position + 1;
    if jsonb_typeof(v_option) <> 'string' then
      raise exception 'poll option label is invalid';
    end if;

    v_label := btrim(v_option #>> '{}');
    if char_length(v_label) not between 1 and 200 then
      raise exception 'poll option label is invalid';
    end if;

    if exists (
      select 1
      from unnest(v_labels) as existing_label
      where lower(existing_label) = lower(v_label)
    ) then
      raise exception 'poll option labels must be unique';
    end if;

    v_labels := array_append(v_labels, v_label);
  end loop;

  insert into public.app_messages (
    sender_id,
    recipient_id,
    channel_type,
    conversation_id,
    topic_id,
    message_kind,
    related_event_id,
    arrondissement_id,
    zone_name,
    content,
    attachment_url,
    attachment_type,
    attachment_expires_at
  ) values (
    btrim(p_actor_user_id),
    nullif(btrim(p_recipient_id), ''),
    p_channel_type,
    p_conversation_id,
    p_topic_id,
    'poll',
    null,
    p_arrondissement_id,
    nullif(btrim(p_zone_name), ''),
    btrim(p_content),
    null,
    null,
    null
  ) returning id into v_message_id;

  v_position := 0;
  foreach v_label in array v_labels
  loop
    v_position := v_position + 1;
    insert into public.chat_poll_options (message_id, position, label)
    values (v_message_id, v_position, v_label);
  end loop;

  return v_message_id;
end;
$$;

revoke all on function public.create_chat_poll_with_options_for_server(
  text, text, text, text, jsonb, text, uuid, integer, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_chat_poll_with_options_for_server(
  text, text, text, text, jsonb, text, uuid, integer, text
) to service_role;

comment on function public.create_chat_poll_with_options_for_server(
  text, text, text, text, jsonb, text, uuid, integer, text
) is
  'Server-only atomic poll persistence. /api/chat must establish Clerk AuthZ and reserve the canonical message quota before calling it.';
