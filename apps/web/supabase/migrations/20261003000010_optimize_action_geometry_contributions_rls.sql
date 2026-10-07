-- Keep the service-only boundary while allowing PostgreSQL to initialize auth.role() once per statement.
-- FK decision: DEFER_NO_CURRENT_WORKLOAD_PROOF for mission_id. The nullable provenance relation
-- has no current mission_id workload justifying a new index; reassess if that workload appears.
alter policy action_geometry_contributions_service_only
on public.action_geometry_contributions
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');
