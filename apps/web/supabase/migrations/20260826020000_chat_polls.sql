-- Polls remain messages. The options are child rows created by one invoker RPC.

create table if not exists public.chat_poll_options (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.app_messages(id) on delete cascade,
  position smallint not null,
  label text not null,
  constraint chat_poll_options_position_check check (position between 1 and 6),
  constraint chat_poll_options_label_check check (char_length(btrim(label)) between 1 and 200),
  constraint chat_poll_options_message_position_key unique (message_id, position)
);

create unique index if not exists idx_chat_poll_options_message_label_unique
  on public.chat_poll_options(message_id, lower(btrim(label)));

create index if not exists idx_chat_poll_options_message_position
  on public.chat_poll_options(message_id, position);

alter table public.chat_poll_options enable row level security;

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
      and m.channel_type = 'community'
  )
  and auth.role() in ('authenticated', 'service_role')
);

drop policy if exists chat_poll_options_insert_own_poll on public.chat_poll_options;
create policy chat_poll_options_insert_own_poll
on public.chat_poll_options
for insert
with check (
  auth.role() in ('authenticated', 'service_role')
  and exists (
    select 1
    from public.app_messages m
    where m.id = chat_poll_options.message_id
      and m.sender_id = coalesce(auth.jwt() ->> 'sub', '')
      and m.message_kind = 'poll'
      and m.channel_type = 'community'
  )
);

drop function if exists public.validate_chat_poll_option_parent();
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
      and m.channel_type = 'community'
  ) then
    raise exception 'poll options require a community poll message';
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

revoke all on table public.chat_poll_options from public, anon;
grant select, insert on table public.chat_poll_options to authenticated, service_role;

alter table public.app_messages
  drop constraint if exists app_messages_message_kind_check;

alter table public.app_messages
  add constraint app_messages_message_kind_check
  check (message_kind in ('message', 'announcement', 'poll'));

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
      and channel_type = 'community'
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_poll_channel_check;

alter table public.app_messages
  add constraint app_messages_poll_channel_check
  check (
    message_kind <> 'poll'
    or (
      channel_type = 'community'
      and related_event_id is null
    )
  );

alter table public.app_messages
  drop constraint if exists app_messages_poll_attachment_check;

alter table public.app_messages
  add constraint app_messages_poll_attachment_check
  check (
    message_kind <> 'poll'
    or (attachment_url is null and attachment_type is null and attachment_expires_at is null)
  );

drop function if exists public.create_chat_poll_with_options(text, text, jsonb);
create or replace function public.create_chat_poll_with_options(
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
    'community',
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

revoke all on function public.create_chat_poll_with_options(text, text, jsonb) from public, anon;
grant execute on function public.create_chat_poll_with_options(text, text, jsonb) to authenticated, service_role;
