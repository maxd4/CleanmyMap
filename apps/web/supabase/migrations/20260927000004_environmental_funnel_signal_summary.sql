-- Keep the environmental estimator's active funnel path bounded while moving
-- aggregation next to the source table. The 3,000-row order is deliberately
-- identical to the historical loader contract.
create or replace function public.load_environmental_funnel_signal_summary(
  p_user_id text,
  p_now timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounded_events as (
    select
      at,
      user_id,
      session_id,
      step,
      mode,
      meta,
      case
        when jsonb_typeof(meta -> 'pagePath') = 'string' and btrim(meta ->> 'pagePath') <> ''
          then btrim(meta ->> 'pagePath')
        when jsonb_typeof(meta -> 'pathname') = 'string' and btrim(meta ->> 'pathname') <> ''
          then btrim(meta ->> 'pathname')
        when jsonb_typeof(meta -> 'routePath') = 'string' and btrim(meta ->> 'routePath') <> ''
          then btrim(meta ->> 'routePath')
        else null
      end as route_path
    from public.funnel_events
    order by at desc, session_id desc, step desc, mode desc, user_id desc nulls last
    limit 3000
  ),
  scoped_events as (
    select 'all_time'::text as scope, events.*
    from bounded_events as events
    union all
    select 'current'::text as scope, events.*
    from bounded_events as events
    where events.at >= p_now - interval '30 days'
      and events.at <= p_now
    union all
    select 'previous'::text as scope, events.*
    from bounded_events as events
    where events.at >= p_now - interval '60 days'
      and events.at < p_now - interval '30 days'
    union all
    select 'user'::text as scope, events.*
    from bounded_events as events
    where p_user_id is not null
      and events.user_id = p_user_id
  ),
  scope_keys as (
    select 'all_time'::text as scope
    union all select 'current'::text
    union all select 'previous'::text
    union all select 'user'::text where p_user_id is not null
  ),
  user_ids as (
    select scope, jsonb_agg(to_jsonb(user_id) order by user_id) as user_values
    from (
      select distinct scope, nullif(btrim(user_id), '') as user_id
      from scoped_events
      where user_id is not null and btrim(user_id) <> ''
    ) as distinct_users
    group by scope
  ),
  distinct_routes as (
    select scope, count(distinct route_path) as route_count
    from scoped_events
    where route_path is not null
      and step in ('page_view', 'view_new', 'start_form')
    group by scope
  ),
  route_counts as (
    select scope, route_path, count(*) as event_count
    from scoped_events
    where route_path is not null
      and step in ('page_view', 'view_new')
    group by scope, route_path
  ),
  route_count_json as (
    select
      scope,
      jsonb_agg(
        jsonb_build_object('path', route_path, 'count', event_count)
        order by route_path
      ) as route_values
    from route_counts
    group by scope
  ),
  metrics as (
    select
      keys.scope,
      jsonb_build_object(
        'eventCount', count(events.at),
        'detailedPageViewCount', count(events.at) filter (where events.step = 'page_view'),
        'legacyPageViewCount', count(events.at) filter (where events.step = 'view_new'),
        'sessionCount', count(distinct nullif(btrim(events.session_id), '')),
        'userIds', coalesce(users.user_values, '[]'::jsonb),
        'distinctRouteCount', coalesce(routes.route_count, 0),
        'routeCounts', coalesce(route_values.route_values, '[]'::jsonb),
        'earliestAt', min(events.at)
      ) as value
    from scope_keys as keys
    left join scoped_events as events on events.scope = keys.scope
    left join user_ids as users on users.scope = keys.scope
    left join distinct_routes as routes on routes.scope = keys.scope
    left join route_count_json as route_values on route_values.scope = keys.scope
    group by keys.scope, users.user_values, routes.route_count, route_values.route_values
  )
  select jsonb_build_object(
    'allTime', (select value from metrics where scope = 'all_time'),
    'current', (select value from metrics where scope = 'current'),
    'previous', (select value from metrics where scope = 'previous'),
    'user', case when p_user_id is null then null else (select value from metrics where scope = 'user') end
  );
$$;

revoke all on function public.load_environmental_funnel_signal_summary(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.load_environmental_funnel_signal_summary(text, timestamptz)
  to service_role;
