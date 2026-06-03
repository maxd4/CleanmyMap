-- 20260602000001_action_pollution_score_references_rpc.sql
-- Référence dynamique: plus forte action par bénévole dans la base.

create or replace function public.action_pollution_score_references()
returns table (
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  source_count integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    coalesce(
      max(coalesce(waste_kg, 0)::numeric / greatest(coalesce(volunteers_count, 0), 1)),
      0
    ) as waste_per_volunteer,
    coalesce(
      max(coalesce(cigarette_butts, 0)::numeric / greatest(coalesce(volunteers_count, 0), 1)),
      0
    ) as butts_per_volunteer,
    count(*)::integer as source_count,
    now() as updated_at
  from public.actions
  where status = 'approved';
$$;

revoke all on function public.action_pollution_score_references() from public;
grant execute on function public.action_pollution_score_references() to public;

alter table public.actions
  drop column if exists waste_pollution_score,
  drop column if exists cigarette_butts_pollution_score;
