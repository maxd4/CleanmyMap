-- Lightweight per-user DM read cursors. app_messages remains the source of truth
-- for conversation membership and message history.

create table if not exists public.chat_dm_read_states (
  user_id text not null references public.profiles(id) on delete cascade,
  peer_id text not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null,
  constraint chat_dm_read_states_pkey primary key (user_id, peer_id),
  constraint chat_dm_read_states_distinct_users check (user_id <> peer_id)
);

alter table public.chat_dm_read_states enable row level security;

drop policy if exists chat_dm_read_states_select_own on public.chat_dm_read_states;
create policy chat_dm_read_states_select_own
on public.chat_dm_read_states
for select
using (user_id = coalesce(auth.jwt() ->> 'sub', ''));

drop policy if exists chat_dm_read_states_insert_own on public.chat_dm_read_states;
create policy chat_dm_read_states_insert_own
on public.chat_dm_read_states
for insert
with check (
  user_id = coalesce(auth.jwt() ->> 'sub', '')
  and user_id <> peer_id
);

drop policy if exists chat_dm_read_states_update_own on public.chat_dm_read_states;
create policy chat_dm_read_states_update_own
on public.chat_dm_read_states
for update
using (user_id = coalesce(auth.jwt() ->> 'sub', ''))
with check (
  user_id = coalesce(auth.jwt() ->> 'sub', '')
  and user_id <> peer_id
);

revoke all on table public.chat_dm_read_states from public, anon, authenticated;
grant select, insert, update on table public.chat_dm_read_states to authenticated, service_role;

create index if not exists idx_chat_dm_read_states_user_last_read
  on public.chat_dm_read_states(user_id, last_read_at desc);

create index if not exists idx_app_messages_dm_sender_created_at
  on public.app_messages(sender_id, created_at desc)
  where channel_type = 'dm';

create index if not exists idx_app_messages_dm_recipient_created_at
  on public.app_messages(recipient_id, created_at desc)
  where channel_type = 'dm';

create or replace function public.list_my_dm_conversations()
returns table (
  peer_id text,
  peer_display_name text,
  peer_handle text,
  peer_avatar_url text,
  last_message_id uuid,
  last_message_content text,
  last_message_created_at timestamptz,
  last_message_sender_id text,
  last_message_direction text,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with current_user_context as (
    select coalesce(auth.jwt() ->> 'sub', '') as user_id
  ),
  visible_dm_messages as (
    select m.*
    from public.app_messages m
    cross join current_user_context c
    where m.channel_type = 'dm'
      and (
        m.sender_id = c.user_id
        or m.recipient_id = c.user_id
      )
  ),
  ranked_messages as (
    select
      m.*,
      case
        when m.sender_id = c.user_id then m.recipient_id
        else m.sender_id
      end as conversation_peer_id,
      row_number() over (
        partition by case
          when m.sender_id = c.user_id then m.recipient_id
          else m.sender_id
        end
        order by m.created_at desc, m.id desc
      ) as message_rank
    from visible_dm_messages m
    cross join current_user_context c
    where case
      when m.sender_id = c.user_id then m.recipient_id
      else m.sender_id
    end is not null
  ),
  unread_messages as (
    select
      m.sender_id as conversation_peer_id,
      count(*)::bigint as unread_count
    from visible_dm_messages m
    cross join current_user_context c
    left join public.chat_dm_read_states r
      on r.user_id = c.user_id
      and r.peer_id = m.sender_id
    where m.sender_id <> c.user_id
      and m.recipient_id = c.user_id
      and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    group by m.sender_id
  )
  select
    p.id as peer_id,
    coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.handle), ''), 'Membre') as peer_display_name,
    coalesce(nullif(btrim(p.handle), ''), p.id) as peer_handle,
    p.avatar_url as peer_avatar_url,
    latest.id as last_message_id,
    latest.content as last_message_content,
    latest.created_at as last_message_created_at,
    latest.sender_id as last_message_sender_id,
    case when latest.sender_id = c.user_id then 'sent' else 'received' end as last_message_direction,
    coalesce(unread.unread_count, 0)::bigint as unread_count
  from ranked_messages latest
  cross join current_user_context c
  join public.profiles p on p.id = latest.conversation_peer_id
  left join unread_messages unread on unread.conversation_peer_id = p.id
  where latest.message_rank = 1
  order by latest.created_at desc, latest.id desc
$$;

revoke all on function public.list_my_dm_conversations() from public;
grant execute on function public.list_my_dm_conversations() to authenticated, service_role;

create or replace function public.mark_my_dm_conversation_read(p_peer_id text)
returns timestamptz
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_user_id text := coalesce(auth.jwt() ->> 'sub', '');
  v_peer_id text := nullif(btrim(p_peer_id), '');
  v_last_read_at timestamptz;
begin
  if v_user_id = '' or v_peer_id is null or v_user_id = v_peer_id then
    raise exception 'Invalid DM peer';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_peer_id) then
    raise exception 'DM peer not found';
  end if;

  insert into public.chat_dm_read_states (user_id, peer_id, last_read_at)
  values (v_user_id, v_peer_id, now())
  on conflict (user_id, peer_id) do update
    set last_read_at = greatest(
      public.chat_dm_read_states.last_read_at,
      excluded.last_read_at
    )
  returning last_read_at into v_last_read_at;

  return v_last_read_at;
end;
$$;

revoke all on function public.mark_my_dm_conversation_read(text) from public;
grant execute on function public.mark_my_dm_conversation_read(text) to authenticated, service_role;
