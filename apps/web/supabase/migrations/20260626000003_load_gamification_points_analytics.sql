create or replace function public.load_gamification_points_analytics(
  p_user_id text,
  p_floor_date date default null
)
returns table (
  total_points numeric,
  transaction_count integer,
  event_breakdown jsonb,
  timeline jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with ledger as (
    select
      coalesce(source_event, 'unknown') as source_event,
      amount,
      created_at
    from public.points_ledger
    where user_id::text = p_user_id
      and (
        p_floor_date is null
        or created_at >= (p_floor_date::timestamp at time zone 'UTC')
      )
  ),
  event_breakdown as (
    select
      source_event,
      count(*)::integer as count,
      coalesce(sum(amount), 0)::numeric as points
    from ledger
    group by source_event
  ),
  timeline as (
    select
      created_at::date as day,
      coalesce(sum(amount), 0)::numeric as points
    from ledger
    group by created_at::date
    order by created_at::date
  )
  select
    coalesce(
      (select up.total_points::numeric from public.user_points up where up.user_id::text = p_user_id),
      0::numeric
    ) as total_points,
    coalesce((select count(*)::integer from ledger), 0) as transaction_count,
    coalesce(
      (
        select jsonb_object_agg(
          source_event,
          jsonb_build_object('count', count, 'points', points)
        )
        from event_breakdown
      ),
      '{}'::jsonb
    ) as event_breakdown,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'date',
            to_char(day, 'YYYY-MM-DD'),
            'points',
            points
          )
        )
        from timeline
      ),
      '[]'::jsonb
    ) as timeline;
$$;

revoke all on function public.load_gamification_points_analytics(text, date) from public;
revoke all on function public.load_gamification_points_analytics(text, date) from anon;
revoke all on function public.load_gamification_points_analytics(text, date) from authenticated;
revoke all on function public.load_gamification_points_analytics(text, date) from service_role;
grant execute on function public.load_gamification_points_analytics(text, date) to service_role;
