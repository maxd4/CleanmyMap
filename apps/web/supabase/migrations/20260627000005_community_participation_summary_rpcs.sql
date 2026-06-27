create or replace function public.load_community_event_rsvp_summaries(
  p_event_ids uuid[],
  p_user_id text default null
)
returns table (
  event_id uuid,
  yes_count bigint,
  maybe_count bigint,
  no_count bigint,
  total_count bigint,
  my_rsvp_status text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with requested_events as (
  select distinct on (event_id)
    event_id,
    ordinality
  from unnest(coalesce(p_event_ids, '{}'::uuid[])) with ordinality as input(event_id, ordinality)
  order by event_id, ordinality
),
event_totals as (
  select
    r.event_id,
    count(*) filter (where r.status = 'yes')::bigint as yes_count,
    count(*) filter (where r.status = 'maybe')::bigint as maybe_count,
    count(*) filter (where r.status = 'no')::bigint as no_count,
    count(*)::bigint as total_count
  from public.event_rsvps r
  join requested_events re
    on re.event_id = r.event_id
  group by r.event_id
),
user_rsvps as (
  select
    r.event_id,
    r.status as my_rsvp_status
  from public.event_rsvps r
  where p_user_id is not null
    and r.participant_clerk_id = p_user_id
    and r.event_id = any(coalesce(p_event_ids, '{}'::uuid[]))
)
select
  re.event_id,
  coalesce(totals.yes_count, 0)::bigint as yes_count,
  coalesce(totals.maybe_count, 0)::bigint as maybe_count,
  coalesce(totals.no_count, 0)::bigint as no_count,
  coalesce(totals.total_count, 0)::bigint as total_count,
  ur.my_rsvp_status
from requested_events re
left join event_totals totals
  on totals.event_id = re.event_id
left join user_rsvps ur
  on ur.event_id = re.event_id
order by re.ordinality;
$$;

revoke all on function public.load_community_event_rsvp_summaries(uuid[], text) from public;
revoke all on function public.load_community_event_rsvp_summaries(uuid[], text) from anon;
revoke all on function public.load_community_event_rsvp_summaries(uuid[], text) from authenticated;
revoke all on function public.load_community_event_rsvp_summaries(uuid[], text) from service_role;
grant execute on function public.load_community_event_rsvp_summaries(uuid[], text) to service_role;

create or replace function public.load_action_participant_summaries(
  p_action_ids uuid[],
  p_user_id text default null
)
returns table (
  action_id uuid,
  active_count bigint,
  total_count bigint,
  my_participation_status text,
  my_participation_source text,
  my_joined_at timestamptz,
  my_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with requested_actions as (
  select distinct on (action_id)
    action_id,
    ordinality
  from unnest(coalesce(p_action_ids, '{}'::uuid[])) with ordinality as input(action_id, ordinality)
  order by action_id, ordinality
),
action_totals as (
  select
    ap.action_id,
    count(*) filter (where ap.participation_status = 'confirmed')::bigint as active_count,
    count(*)::bigint as total_count
  from public.action_participants ap
  join requested_actions ra
    on ra.action_id = ap.action_id
  group by ap.action_id
),
user_participation as (
  select
    ap.action_id,
    ap.participation_status,
    ap.participation_source,
    ap.joined_at,
    ap.updated_at
  from public.action_participants ap
  where p_user_id is not null
    and ap.user_id = p_user_id
    and ap.action_id = any(coalesce(p_action_ids, '{}'::uuid[]))
)
select
  ra.action_id,
  coalesce(totals.active_count, 0)::bigint as active_count,
  coalesce(totals.total_count, 0)::bigint as total_count,
  up.participation_status as my_participation_status,
  up.participation_source as my_participation_source,
  up.joined_at as my_joined_at,
  up.updated_at as my_updated_at
from requested_actions ra
left join action_totals totals
  on totals.action_id = ra.action_id
left join user_participation up
  on up.action_id = ra.action_id
order by ra.ordinality;
$$;

revoke all on function public.load_action_participant_summaries(uuid[], text) from public;
revoke all on function public.load_action_participant_summaries(uuid[], text) from anon;
revoke all on function public.load_action_participant_summaries(uuid[], text) from authenticated;
revoke all on function public.load_action_participant_summaries(uuid[], text) from service_role;
grant execute on function public.load_action_participant_summaries(uuid[], text) to service_role;
