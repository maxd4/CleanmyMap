-- Keep individual poll votes private while moving aggregate reads behind the
-- server. The route supplies a poll list already authorized by Clerk RLS.

drop function if exists public.get_my_chat_poll_vote_summaries(uuid[]);
drop function if exists public.get_my_chat_poll_vote_summaries(uuid[], text);

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
      and m.channel_type = 'community'
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
