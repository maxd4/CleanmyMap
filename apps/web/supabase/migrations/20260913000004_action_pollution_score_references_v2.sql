-- Canonical V2 global pollution references.
-- Eligibility is the completed, approved, public field-action predicate. The
-- reference for each metric is the maximum observed intensity for that metric;
-- NULL metrics do not become zero and do not enter that metric's population.

create function public.action_pollution_score_references_v2()
returns table (
  scope text,
  department_code text,
  department_name text,
  waste_per_volunteer_hour numeric,
  butts_per_volunteer_hour numeric,
  waste_source_count integer,
  butts_source_count integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with eligible_actions as (
    select
      a.waste_kg,
      a.cigarette_butts,
      (a.volunteers_count::numeric * a.duration_minutes::numeric) / 60::numeric
        as work_hours
    from public.actions as a
    where a.status = 'approved'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
      and a.action_date <= current_date
      and a.volunteers_count >= 1
      and a.duration_minutes > 0
  )
  select
    'global'::text as scope,
    null::text as department_code,
    null::text as department_name,
    max(waste_kg::numeric / work_hours)
      filter (where waste_kg is not null and waste_kg >= 0) as waste_per_volunteer_hour,
    max(cigarette_butts::numeric / work_hours)
      filter (where cigarette_butts is not null and cigarette_butts >= 0)
      as butts_per_volunteer_hour,
    count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer
      as waste_source_count,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer
      as butts_source_count,
    now() as updated_at
  from eligible_actions;
$$;

revoke all on function public.action_pollution_score_references_v2() from public;
grant execute on function public.action_pollution_score_references_v2() to public;
