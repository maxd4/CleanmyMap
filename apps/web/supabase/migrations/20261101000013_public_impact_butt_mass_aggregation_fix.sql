-- PUBLIC-IMPACT-BUTT-MASS-AGGREGATION-FIX-2026-11
-- PURPOSE: prevent mass-contribution expansion from multiplying the canonical
-- per-condition cigarette-butt count in the full public summary.
-- CALLER: service_role through the existing public landing summary RPC.
-- AUTHORIZATION_BOUNDARY: preserve the existing SECURITY INVOKER/service_role
-- boundary; no table, source action, or projection cache is mutated.
-- IDEMPOTENCY: CREATE OR REPLACE changes only the RPC definition.
-- ATOMICITY: the stable read computes counts and mass provenance in separate
-- aggregates before joining them by condition.
-- FAILURE_BEHAVIOR: unknown or absent mass contributions remain an empty JSON
-- array; the canonical count is never inferred from mass rows.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: preserve service_role-only execution.

create or replace function public.load_public_landing_action_summary(
  p_floor_date date
)
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with contributions as (
  select (public.build_public_impact_action_contribution(a)).*
  from public.actions a
  where a.action_date >= p_floor_date and a.action_date <= current_date
), eligible as (
  select * from contributions where eligible_non_temporal
), distribution as (
  select category_key, max(category_label) as category_label, count(*)::bigint as action_count
  from eligible group by category_key
), warnings as (
  select warning_code, count(*)::bigint as warning_count
  from eligible where warning_code is not null group by warning_code
), butt_counts as (
  select b.condition, sum(b.cigarette_butts)::bigint as count
  from eligible e
  cross join lateral public.public_impact_butt_condition_projections(e) b
  group by b.condition
), butt_mass_contributions as (
  select b.condition,
    coalesce(jsonb_agg(item.value) filter (where item.value is not null), '[]'::jsonb) as mass_contributions
  from eligible e
  cross join lateral public.public_impact_butt_condition_projections(e) b
  left join lateral jsonb_array_elements(b.mass_contributions) as item(value) on true
  group by b.condition
), butt_conditions as (
  select counts.condition, counts.count,
    coalesce(mass.mass_contributions, '[]'::jsonb) as mass_contributions
  from butt_counts counts
  left join butt_mass_contributions mass on mass.condition = counts.condition
)
select count(*)::bigint, count(distinct location_label)::bigint,
  coalesce(sum(waste_kg), 0::numeric), coalesce(sum(cigarette_butts), 0::bigint),
  coalesce(sum(participants_total), 0::bigint), coalesce(sum(participants_total), 0::bigint),
  coalesce(sum(duration_minutes), 0::bigint),
  coalesce((select jsonb_agg(jsonb_build_object('key', category_key, 'category', category_label, 'count', action_count)
    order by category_key) from distribution), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object('code', warning_code, 'count', warning_count)
    order by warning_code) from warnings), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object(
      'condition', condition, 'count', count, 'massContributions', mass_contributions)
    order by condition) from butt_conditions), '[]'::jsonb)
from eligible;
$$;

revoke all on function public.load_public_landing_action_summary(date)
  from public, anon, authenticated, service_role;
grant execute on function public.load_public_landing_action_summary(date) to service_role;
