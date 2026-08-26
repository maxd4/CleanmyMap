-- Poll votes stay separate from messages and options. Individual votes remain
-- private to their owner; public reads use the aggregate RPC below.

alter table public.chat_poll_options
  drop constraint if exists chat_poll_options_message_id_id_key;

alter table public.chat_poll_options
  add constraint chat_poll_options_message_id_id_key unique (message_id, id);

create table if not exists public.chat_poll_votes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  option_id uuid not null,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint chat_poll_votes_message_user_key unique (message_id, user_id),
  constraint chat_poll_votes_option_message_fkey
    foreign key (message_id, option_id)
    references public.chat_poll_options(message_id, id)
    on delete cascade
);

create index if not exists idx_chat_poll_votes_message_option
  on public.chat_poll_votes(message_id, option_id);

create index if not exists idx_chat_poll_votes_user_message
  on public.chat_poll_votes(user_id, message_id);

alter table public.chat_poll_votes enable row level security;

drop policy if exists chat_poll_votes_select_own on public.chat_poll_votes;
create policy chat_poll_votes_select_own
on public.chat_poll_votes
for select
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists chat_poll_votes_insert_own on public.chat_poll_votes;
create policy chat_poll_votes_insert_own
on public.chat_poll_votes
for insert
with check (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists chat_poll_votes_update_own on public.chat_poll_votes;
create policy chat_poll_votes_update_own
on public.chat_poll_votes
for update
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists chat_poll_votes_delete_own on public.chat_poll_votes;
create policy chat_poll_votes_delete_own
on public.chat_poll_votes
for delete
using (
  user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop function if exists public.validate_chat_poll_vote_parent();
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
      and m.channel_type = 'community'
  ) then
    raise exception 'poll votes require an option from a visible community poll';
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

drop trigger if exists trg_chat_poll_votes_updated_at on public.chat_poll_votes;
create trigger trg_chat_poll_votes_updated_at
before update on public.chat_poll_votes
for each row execute procedure public.set_updated_at();

revoke all on table public.chat_poll_votes from public, anon;
grant select, insert, update, delete on table public.chat_poll_votes to authenticated, service_role;

-- SECURITY DEFINER is intentional here: the caller may see only their own
-- vote rows, while this function returns counts without returning voter IDs.
-- Polls are community-visible by contract, and every other message is excluded.
drop function if exists public.get_my_chat_poll_vote_summaries(uuid[]);
create or replace function public.get_my_chat_poll_vote_summaries(p_message_ids uuid[])
returns table (
  message_id uuid,
  option_id uuid,
  vote_count bigint,
  total_votes bigint,
  selected_option_id uuid
)
language sql
security definer
set search_path = pg_catalog
as $$
  with visible_polls as (
    select m.id
    from public.app_messages m
    where m.id = any(coalesce(p_message_ids, array[]::uuid[]))
      and m.message_kind = 'poll'
      and m.channel_type = 'community'
      and (select auth.role()) in ('authenticated', 'service_role')
  ),
  my_votes as (
    select v.message_id, v.option_id
    from public.chat_poll_votes v
    join visible_polls p on p.id = v.message_id
    where v.user_id = coalesce((select auth.jwt()) ->> 'sub', '')
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

revoke all on function public.get_my_chat_poll_vote_summaries(uuid[]) from public, anon;
grant execute on function public.get_my_chat_poll_vote_summaries(uuid[]) to authenticated, service_role;
