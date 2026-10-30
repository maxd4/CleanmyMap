-- PURPOSE: restrict contextual collection references to public actions and
-- require two independent sources for each published metric.
-- CALLER: the public action declaration comparison and its server-side RPC.
-- AUTHORIZATION_BOUNDARY: SECURITY INVOKER; only public, approved and visible
-- completed actions contribute to the anonymous/authenticated response.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the versioned RPC identity.
-- ATOMICITY: the function definition is installed atomically by the migration.
-- FAILURE_BEHAVIOR: missing, invalid, partial or single-source metrics remain
-- NULL; no fallback to another context or metric is introduced.
-- SEARCH_PATH: explicitly limited to public and pg_catalog.
-- GRANTS: only anon and authenticated may execute this read-only RPC.

create or replace function public.action_collection_context_reference_averages_v1()
returns table (
  action_context text,
  waste_per_effective_unit numeric,
  butts_per_effective_unit numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with eligible as (
  select
    a.action_context,
    a.waste_kg,
    a.cigarette_butts,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count + 0.45 * a.children_count
      else null
    end as waste_units,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count
      else null
    end as butts_units
  from public.actions a
  where a.status = 'approved'
    and a.moderation_visibility = 'visible'
    and coalesce(a.access_mode, 'public') = 'public'
    and a.action_phase = 'post_action_complete'
    and a.action_date <= current_date
    and a.action_context is not null
    and a.children_count is not null
    and a.adult_count is not null
    and a.retired_count is not null
    and a.children_count + a.adult_count + a.retired_count = a.volunteers_count
    and (a.action_context <> 'school' or a.retired_count = 0)
), grouped as (
  select
    action_context,
    avg(waste_kg / nullif(waste_units, 0)) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    ) as waste_average,
    avg(cigarette_butts::numeric / nullif(butts_units, 0)) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    ) as butts_average,
    count(*) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    )::integer as waste_count,
    count(*) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    )::integer as butts_count,
    count(*) filter (
      where (waste_kg is not null and waste_kg >= 0 and waste_units > 0)
         or (cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0)
    )::integer as eligible_count
  from eligible
  group by action_context
)
select
  action_context,
  case when waste_count >= 2 then waste_average else null end,
  case when butts_count >= 2 then butts_average else null end,
  waste_count,
  butts_count,
  eligible_count,
  'contextual-effective-units-v1'::text,
  now()
from grouped
order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1() from public;
grant execute on function public.action_collection_context_reference_averages_v1() to anon, authenticated;
