-- Extend the existing poll engine to the already-authorized admin_elu channel.
-- This migration is append-only; earlier poll migrations remain unchanged.

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
    and public.current_profile_role_label() in ('admin', 'max', 'elu')
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
    and public.current_profile_role_label() in ('admin', 'max', 'elu')
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

drop policy if exists chat_poll_options_select_visible on public.chat_poll_options;
create policy chat_poll_options_select_visible
on public.chat_poll_options
for select
using (
  exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
  and (select auth.role()) in ('authenticated', 'service_role')
);

drop policy if exists chat_poll_options_insert_own_poll on public.chat_poll_options;
create policy chat_poll_options_insert_own_poll
on public.chat_poll_options
for insert
with check (
  (select auth.role()) in ('authenticated', 'service_role')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.sender_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
);

create or replace function public.validate_chat_poll_option_parent()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.app_messages m
    where m.id = new.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  ) then
    raise exception 'poll options require a visible poll message';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_chat_poll_option_parent() from public;
grant execute on function public.validate_chat_poll_option_parent() to authenticated, service_role;

drop trigger if exists trg_validate_chat_poll_option_parent on public.chat_poll_options;
create trigger trg_validate_chat_poll_option_parent
before insert or update on public.chat_poll_options
for each row execute procedure public.validate_chat_poll_option_parent();

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
        'demande_diffusion'
      )
    )
    or (
      message_kind = 'poll'
      and channel_type in ('community', 'admin_elu')
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_poll_channel_check;

alter table public.app_messages
  add constraint app_messages_poll_channel_check
  check (
    message_kind <> 'poll'
    or (
      channel_type in ('community', 'admin_elu')
      and related_event_id is null
    )
  );

drop function if exists public.create_chat_poll_with_options(text, text, jsonb);
drop function if exists public.create_chat_poll_with_options(text, text, text, jsonb);
create or replace function public.create_chat_poll_with_options(
  p_channel_type text,
  p_content text,
  p_topic_id text,
  p_option_labels jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_id text := coalesce(auth.jwt() ->> 'sub', '');
  v_message_id uuid;
  v_option jsonb;
  v_position smallint := 0;
  v_label text;
  v_labels text[] := array[]::text[];
begin
  if v_user_id = '' then
    raise exception 'authenticated user required';
  end if;

  if p_channel_type not in ('community', 'admin_elu') then
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

  for v_option in
    select value
    from jsonb_array_elements(p_option_labels)
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
    v_user_id,
    null,
    p_channel_type,
    p_topic_id,
    'poll',
    null,
    null,
    null,
    btrim(p_content),
    null,
    null,
    null
  ) returning id into v_message_id;

  v_position := 0;
  foreach v_label in array v_labels loop
    v_position := v_position + 1;
    insert into public.chat_poll_options (message_id, position, label)
    values (v_message_id, v_position, v_label);
  end loop;

  return v_message_id;
end;
$$;

revoke all on function public.create_chat_poll_with_options(text, text, text, jsonb) from public, anon;
grant execute on function public.create_chat_poll_with_options(text, text, text, jsonb) to authenticated, service_role;

drop policy if exists chat_poll_votes_select_own on public.chat_poll_votes;
create policy chat_poll_votes_select_own
on public.chat_poll_votes
for select
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
);

drop policy if exists chat_poll_votes_insert_own on public.chat_poll_votes;
create policy chat_poll_votes_insert_own
on public.chat_poll_votes
for insert
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
);

drop policy if exists chat_poll_votes_update_own on public.chat_poll_votes;
create policy chat_poll_votes_update_own
on public.chat_poll_votes
for update
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
)
with check (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
);

drop policy if exists chat_poll_votes_delete_own on public.chat_poll_votes;
create policy chat_poll_votes_delete_own
on public.chat_poll_votes
for delete
using (
  user_id = coalesce(((select auth.jwt()) ->> 'sub'), '')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_votes.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  )
);

create or replace function public.validate_chat_poll_vote_parent()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.app_messages m
    join public.chat_poll_options o
      on o.message_id = m.id
     and o.id = new.option_id
    where m.id = new.message_id
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  ) then
    raise exception 'poll votes require an option from a visible poll';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_chat_poll_vote_parent() from public;
grant execute on function public.validate_chat_poll_vote_parent() to authenticated, service_role;

drop trigger if exists trg_validate_chat_poll_vote_parent on public.chat_poll_votes;
create trigger trg_validate_chat_poll_vote_parent
before insert or update on public.chat_poll_votes
for each row execute procedure public.validate_chat_poll_vote_parent();

drop function if exists public.get_my_chat_poll_vote_summaries(uuid[]);
create or replace function public.get_my_chat_poll_vote_summaries(
  p_message_ids uuid[],
  p_user_id text
)
returns table (
  message_id uuid,
  option_id uuid,
  vote_count bigint,
  total_votes bigint,
  selected_option_id uuid
)
language sql
security invoker
set search_path = pg_catalog
as $$
  with visible_polls as (
    select m.id
    from public.app_messages m
    where m.id = any(coalesce(p_message_ids, array[]::uuid[]))
      and m.message_kind = 'poll'
      and m.channel_type in ('community', 'admin_elu')
  ),
  my_votes as (
    select v.message_id, v.option_id
    from public.chat_poll_votes v
    join visible_polls p on p.id = v.message_id
    where v.user_id = p_user_id
  ),
  option_counts as (
    select
      p.id as message_id,
      o.id as option_id,
      count(v.id)::bigint as vote_count
    from visible_polls p
    join public.chat_poll_options o on o.message_id = p.id
    left join public.chat_poll_votes v
      on v.message_id = p.id
     and v.option_id = o.id
    group by p.id, o.id
  )
  select
    c.message_id,
    c.option_id,
    c.vote_count,
    sum(c.vote_count) over (partition by c.message_id)::bigint as total_votes,
    (select mv.option_id from my_votes mv where mv.message_id = c.message_id limit 1)
  from option_counts c
  order by c.message_id, c.option_id;
$$;

revoke all on function public.get_my_chat_poll_vote_summaries(uuid[], text)
  from public, anon, authenticated;
grant execute on function public.get_my_chat_poll_vote_summaries(uuid[], text)
  to service_role;

create or replace function public.get_my_unread_chat_notification_counts()
returns table (channel_type text, topic_id text, unread_count bigint)
language sql security invoker set search_path = pg_catalog
as $$
  select n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), ''), count(*)::bigint
  from public.app_notifications n
  where n.user_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and n.type = 'chat'
    and n.read_at is null
    and n.payload ->> 'channelType' in ('community', 'territory', 'admin_elu', 'dm', 'action')
  group by n.payload ->> 'channelType', nullif(btrim(n.payload ->> 'topicId'), '');
$$;

revoke all on function public.get_my_unread_chat_notification_counts() from public, anon;
grant execute on function public.get_my_unread_chat_notification_counts() to authenticated, service_role;
