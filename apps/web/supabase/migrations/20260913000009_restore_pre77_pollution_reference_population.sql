-- Restore the pre-77 reference population without editing the already-applied
-- 20260913000007 migration. The historical contract used approved actions and
-- normalized by the legacy safe volunteer denominator. It did not make
-- duration, phase, action date, or duration-derived eligibility decisions.
--
-- moderation_visibility remains the sole additional predicate because this is
-- a public map reference source and the current public-surface security
-- contract excludes hidden actions. That predicate is a current security
-- boundary, not part of the pre-77 scientific population claim.

create or replace function public.action_pollution_score_references_v2()
returns table (
  scope text,
  department_code text,
  department_name text,
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with eligible_actions as (
    select
      upper(nullif(trim(a.department_code), '')) as department_code,
      nullif(trim(a.department_name), '') as department_name,
      a.waste_kg,
      a.cigarette_butts,
      greatest(coalesce(a.volunteers_count, 0), 1)::numeric as volunteer_count
    from public.actions as a
    where a.status = 'approved'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
  ),
  department_references as (
    select
      department_code,
      max(department_name) as department_name,
      max(waste_kg::numeric / volunteer_count)
        filter (where waste_kg is not null and waste_kg >= 0)
        as waste_per_volunteer,
      max(cigarette_butts::numeric / volunteer_count)
        filter (where cigarette_butts is not null and cigarette_butts >= 0)
        as butts_per_volunteer,
      count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer
        as waste_source_count,
      count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer
        as butts_source_count,
      count(*)::integer as eligible_action_count
    from eligible_actions
    where department_code is not null
    group by department_code
  )
  select
    'global'::text as scope,
    null::text as department_code,
    null::text as department_name,
    max(waste_kg::numeric / volunteer_count)
      filter (where waste_kg is not null and waste_kg >= 0)
      as waste_per_volunteer,
    max(cigarette_butts::numeric / volunteer_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0)
      as butts_per_volunteer,
    count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer
      as waste_source_count,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer
      as butts_source_count,
    count(*)::integer as eligible_action_count,
    now() as updated_at
  from eligible_actions
  union all
  select
    'department'::text as scope,
    department_code,
    department_name,
    waste_per_volunteer,
    butts_per_volunteer,
    waste_source_count,
    butts_source_count,
    eligible_action_count,
    now() as updated_at
  from department_references;
$$;

revoke all on function public.action_pollution_score_references_v2() from public;
grant execute on function public.action_pollution_score_references_v2() to public;
