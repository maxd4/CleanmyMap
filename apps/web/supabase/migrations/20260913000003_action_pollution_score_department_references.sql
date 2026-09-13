-- Extend the canonical pollution score reference RPC with department scopes.
-- The global row intentionally keeps the formula and population of the
-- 20260602000001 RPC unchanged. Department rows are omitted when their
-- minimum data contract is not met, so the client can fail closed.

drop function if exists public.action_pollution_score_references();

create function public.action_pollution_score_references()
returns table (
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  source_count integer,
  updated_at timestamptz,
  department_code text,
  eligible_action_count integer
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with approved_actions as (
    select
      nullif(trim(a.department_code), '') as normalized_department_code,
      coalesce(a.waste_kg, 0)::numeric /
        greatest(coalesce(a.volunteers_count, 0), 1) as waste_per_volunteer,
      coalesce(a.cigarette_butts, 0)::numeric /
        greatest(coalesce(a.volunteers_count, 0), 1) as butts_per_volunteer
    from public.actions as a
    where a.status = 'approved'
  ),
  global_reference as (
    select
      coalesce(max(waste_per_volunteer), 0) as waste_per_volunteer,
      coalesce(max(butts_per_volunteer), 0) as butts_per_volunteer,
      count(*)::integer as source_count,
      now() as updated_at,
      null::text as department_code,
      null::integer as eligible_action_count
    from approved_actions
  ),
  department_references as (
    select
      max(waste_per_volunteer) as waste_per_volunteer,
      max(butts_per_volunteer) as butts_per_volunteer,
      count(*)::integer as source_count,
      now() as updated_at,
      normalized_department_code as department_code,
      count(*)::integer as eligible_action_count
    from approved_actions
    where normalized_department_code is not null
    group by normalized_department_code
    having count(*) >= 2
      and max(waste_per_volunteer) > 0
      and max(butts_per_volunteer) > 0
  )
  select
    waste_per_volunteer,
    butts_per_volunteer,
    source_count,
    updated_at,
    department_code,
    eligible_action_count
  from global_reference
  union all
  select
    waste_per_volunteer,
    butts_per_volunteer,
    source_count,
    updated_at,
    department_code,
    eligible_action_count
  from department_references;
$$;

revoke all on function public.action_pollution_score_references() from public;
grant execute on function public.action_pollution_score_references() to public;
