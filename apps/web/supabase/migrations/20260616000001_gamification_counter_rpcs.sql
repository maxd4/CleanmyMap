create or replace function public.load_gamification_funnel_counts()
returns table (
  total_users integer,
  users_with_points integer,
  users_with_badges integer,
  users_high_activity integer
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    coalesce((select count(*)::integer from public.user_points), 0) as total_users,
    coalesce((select count(*)::integer from public.user_points where total_points > 0), 0) as users_with_points,
    coalesce((select count(*)::integer from public.user_points where total_points >= 10), 0) as users_with_badges,
    coalesce((select count(*)::integer from public.user_points where total_points >= 500), 0) as users_high_activity;
$$;

create or replace function public.load_gamification_user_counters(p_user_id text)
returns table (
  total_points numeric,
  approved_actions_count integer,
  complete_actions_count integer,
  visited_places_count integer,
  eligible_forms_count integer,
  participation_count integer
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with relevant_action_ids as (
    select distinct a.id
    from public.actions a
    where a.created_by_clerk_id = p_user_id

    union

    select distinct ao.action_id
    from public.action_organizers ao
    where ao.organizer_clerk_id = p_user_id
  ),
  relevant_actions as (
    select
      a.id,
      a.type,
      a.actor_name,
      a.location_label,
      a.waste_kg,
      a.volunteers_count,
      a.duration_minutes,
      a.status
    from public.actions a
    join relevant_action_ids rai on rai.id = a.id
  ),
  validated_actions as (
    select distinct f.action_id
    from public.forms f
    join relevant_actions a on a.id = f.action_id
    where a.status = 'approved'
      and f.status not in ('draft', 'deleted', 'incomplete')
      and coalesce(f.validated_by_admin, false) = true
      and coalesce(f.is_duplicate, false) = false
      and coalesce(f.is_deleted, false) = false
      and coalesce(f.is_test, false) = false
  ),
  eligible_form_keys as (
    select distinct
      f.action_id,
      coalesce(nullif(f.group_id::text, ''), 'null') as group_key
    from public.forms f
    join relevant_actions a on a.id = f.action_id
    where a.status = 'approved'
      and coalesce(a.type, '') <> 'zone_propre'
      and f.status not in ('draft', 'deleted', 'incomplete')
      and coalesce(f.validated_by_admin, false) = true
      and coalesce(f.is_duplicate, false) = false
      and coalesce(f.is_deleted, false) = false
      and coalesce(f.is_test, false) = false
  )
  select
    coalesce(
      (select up.total_points::numeric from public.user_points up where up.user_id::text = p_user_id),
      0::numeric
    ) as total_points,
    coalesce((select count(*)::integer from relevant_actions a where a.status = 'approved'), 0) as approved_actions_count,
    coalesce(
      (
        select count(*)::integer
        from relevant_actions a
        where a.status = 'approved'
          and char_length(trim(coalesce(a.location_label, ''))) >= 3
          and coalesce(a.waste_kg, 0) >= 0
          and coalesce(a.volunteers_count, 0) >= 1
          and coalesce(a.duration_minutes, 0) >= 0
          and char_length(trim(coalesce(a.actor_name, ''))) > 0
          and exists (
            select 1
            from validated_actions va
            where va.action_id = a.id
          )
      ),
      0
    ) as complete_actions_count,
    coalesce(
      (select count(*)::integer from public.user_visited_places uvp where uvp.user_id::text = p_user_id),
      0
    ) as visited_places_count,
    coalesce((select count(*)::integer from eligible_form_keys), 0) as eligible_forms_count,
    coalesce(
      (select count(*)::integer from public.action_participants ap where ap.user_id = p_user_id),
      0
    ) as participation_count;
$$;

revoke all on function public.load_gamification_funnel_counts() from public;
revoke all on function public.load_gamification_funnel_counts() from anon;
revoke all on function public.load_gamification_funnel_counts() from authenticated;
revoke all on function public.load_gamification_funnel_counts() from service_role;
grant execute on function public.load_gamification_funnel_counts() to service_role;

revoke all on function public.load_gamification_user_counters(text) from public;
revoke all on function public.load_gamification_user_counters(text) from anon;
revoke all on function public.load_gamification_user_counters(text) from authenticated;
revoke all on function public.load_gamification_user_counters(text) from service_role;
grant execute on function public.load_gamification_user_counters(text) to service_role;
