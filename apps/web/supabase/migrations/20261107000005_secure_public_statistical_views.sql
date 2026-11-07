-- PURPOSE: close direct browser access to statistical snapshot projections while
--          keeping the filtered map and pollution-reference RPC contracts.
-- CALLER: public map/pollution RPCs and service_role diagnostics only.
-- AUTHORIZATION_BOUNDARY: browser roles execute only the two aggregate/projection
--                         RPCs; snapshots and their views are not directly readable.
-- IDEMPOTENCY: CREATE OR REPLACE preserves view signatures and RPC signatures;
--              current-action revocation is evaluated on every read.
-- ATOMICITY: view definitions, grants and function security attributes change in
--            one migration transaction.
-- FAILURE_BEHAVIOR: a missing current public action removes its snapshot-backed
--                   measures from the public projection without deleting history.
-- SEARCH_PATH: SECURITY DEFINER RPCs retain an explicit public, pg_catalog path.
-- GRANTS: no SELECT on either view for public, anon or authenticated; only the
--         existing filtered RPC contracts remain browser-callable.

-- The view remains a reusable projection for privileged maintenance, but its
-- direct browser surface is closed. SECURITY INVOKER also makes the underlying
-- table RLS contract apply to any direct privileged caller rather than turning
-- the view itself into a second authorization boundary.
create or replace view public.action_pollution_score_reference_population
with (security_barrier = true, security_invoker = true)
as
with eligible_versions as (
  select
    upper(nullif(trim(v.department_code), '')) as department_code,
    nullif(trim(v.department_name), '') as department_name,
    v.waste_kg,
    v.cigarette_butts,
    v.volunteers_count::numeric as volunteer_count
  from public.action_statistical_versions v
  join public.actions a on a.id = v.action_id
  where v.is_current
    and public.is_current_public_action_statistical_eligible(
      a.status, a.action_phase, a.access_mode,
      a.moderation_visibility, a.review_state, a.data_provenance
    )
    and public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      current_date
    )
    and v.volunteers_count >= 1
    and v.duration_minutes > 0
), department_references as (
  select
    department_code,
    max(department_name) as department_name,
    max(waste_kg::numeric / volunteer_count)
      filter (where waste_kg is not null and waste_kg >= 0) as waste_per_volunteer,
    max(cigarette_butts::numeric / volunteer_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0) as butts_per_volunteer,
    count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer as waste_source_count,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer as butts_source_count,
    count(*)::integer as eligible_action_count
  from eligible_versions
  where department_code is not null
  group by department_code
)
select
  'global'::text as scope,
  null::text as department_code,
  null::text as department_name,
  max(waste_kg::numeric / volunteer_count)
    filter (where waste_kg is not null and waste_kg >= 0) as waste_per_volunteer,
  max(cigarette_butts::numeric / volunteer_count)
    filter (where cigarette_butts is not null and cigarette_butts >= 0) as butts_per_volunteer,
  count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer as waste_source_count,
  count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer as butts_source_count,
  count(*)::integer as eligible_action_count
from eligible_versions
union all
select
  'department'::text, department_code, department_name,
  waste_per_volunteer, butts_per_volunteer, waste_source_count,
  butts_source_count, eligible_action_count
from department_references;

revoke all on public.action_pollution_score_reference_population
  from public, anon, authenticated, service_role;
grant select on public.action_pollution_score_reference_population to service_role;

-- The map projection has the same current-action gate. Its public owner remains
-- actions_map_feed(), which is now the only browser route able to consume this
-- snapshot projection.
create or replace view public.action_map_statistical_source
with (security_barrier = true, security_invoker = true)
as
select
  v.action_id,
  v.action_date,
  v.location_label,
  v.action_context,
  v.waste_kg,
  v.cigarette_butts,
  v.volunteers_count,
  v.duration_minutes
from public.action_statistical_versions v
join public.actions a on a.id = v.action_id
where v.is_current
  and public.is_current_public_action_statistical_eligible(
    a.status, a.action_phase, a.access_mode,
    a.moderation_visibility, a.review_state, a.data_provenance
  )
  and v.status = 'approved'
  and coalesce(v.action_phase, 'post_action_complete') = 'post_action_complete'
  and coalesce(v.access_mode, 'public') = 'public'
  and coalesce(v.moderation_visibility, 'visible') = 'visible'
  and coalesce(v.review_state, 'not_required') in ('not_required', 'approved')
  and coalesce(v.data_provenance, 'unknown') <> 'test';

revoke all on public.action_map_statistical_source
  from public, anon, authenticated, service_role;
grant select on public.action_map_statistical_source to service_role;

-- The RPCs are the explicit, filtered public contracts. SECURITY DEFINER is
-- required because the underlying snapshot table is service-only; the bodies
-- return only their existing projection and retain their current-action gates.
alter function public.action_pollution_score_references_v2()
  security definer;
alter function public.action_pollution_score_references_v2()
  set search_path = pg_catalog, public;

alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) security definer;
alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) set search_path = public, pg_catalog;

revoke all on function public.action_pollution_score_references_v2() from public;
grant execute on function public.action_pollution_score_references_v2()
  to public;
revoke all on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;
