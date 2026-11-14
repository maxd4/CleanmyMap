-- Forward-only hardening for the 48 WARN findings observed on 2026-11-14.
--
-- Decisions:
-- * 22 auth_rls_initplan findings are fixed by init-plan wrapping only.
-- * 6 JWT findings are false positives: pg_policies already shows the
--   calls under SELECT and they are intentionally left unchanged.
-- * spogomi_event_route_revisions keeps authenticated organizer reads and
--   service_role read/write; its service policy is no longer applicable to
--   browser roles for SELECT, removing the six duplicate-policy findings.
-- * trigger helpers are not RPC contracts; browser EXECUTE is revoked.
-- * is_current_public_action_statistical_eligible is a pure argument
--   predicate and becomes SECURITY INVOKER.
-- * The four public statistical/map RPCs remain SECURITY DEFINER because their
--   source projections are service-only. Their bodies already use fixed
--   search_path values, explicit allowlists, current-action eligibility gates
--   and bounded results. Their eight corresponding Advisor findings are
--   DOCUMENTED_ACCEPTED_RISK, not silently suppressed.

-- 22 direct auth.role() checks: expression-only changes, preserving each
-- policy's table, command, roles and service_role predicate.
alter policy action_retrospectives_service_only
  on public.action_retrospectives
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy admin_operations_audit_service_insert
  on public.admin_operations_audit
  with check ((select auth.role()) = 'service_role');

alter policy admin_operations_audit_service_read_insert
  on public.admin_operations_audit
  using ((select auth.role()) = 'service_role');

alter policy partner_annuaire_entries_service_only
  on public.partner_annuaire_entries
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_network_connections_service_role
  on public.pedestrian_network_connections
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_network_diagnostics_service_role
  on public.pedestrian_network_diagnostics
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_network_edges_service_role
  on public.pedestrian_network_edges
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_network_nodes_service_role
  on public.pedestrian_network_nodes
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_network_versions_service_role
  on public.pedestrian_network_versions
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_observation_cache_versions_service_role
  on public.pedestrian_observation_cache_versions
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_risk_cache_invalidation_events_service_role
  on public.pedestrian_risk_cache_invalidation_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_risk_projection_versions_service_role
  on public.pedestrian_risk_projection_versions
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_segment_observation_cache_service_role
  on public.pedestrian_segment_observation_cache
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy pedestrian_segment_risk_projections_service_role
  on public.pedestrian_segment_risk_projections
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy public_impact_action_butt_projections_service_only
  on public.public_impact_action_cigarette_butt_projections
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy report_generation_pdf_artifacts_service_only
  on public.report_generation_pdf_artifacts
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy report_generation_pdf_shares_service_only
  on public.report_generation_pdf_shares
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_event_route_revisions_service_write
  on public.spogomi_event_route_revisions
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_volunteer_help_proposal_events_service_only
  on public.spogomi_volunteer_help_proposal_events
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_volunteer_help_proposals_service_only
  on public.spogomi_volunteer_help_proposals
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy territorial_legend_award_proofs_service_only
  on public.territorial_legend_award_proofs
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy territorial_legend_hold_periods_service_only
  on public.territorial_legend_hold_periods
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- The six JWT findings are intentionally not altered: their current
-- pg_policies expressions already contain a scalar SELECT around the JWT
-- helper, and a second
-- rewrite would change no runtime behavior or Advisor result.

-- Trigger-only helpers: no browser or direct Data API execution contract.
revoke all on function public.enqueue_cleaning_action_observation_invalidation()
  from public, anon, authenticated, service_role;
revoke all on function public.enqueue_trash_spotter_observation_invalidation()
  from public, anon, authenticated, service_role;

-- Pure predicate: preserve direct anon/authenticated use while removing the
-- unnecessary SECURITY DEFINER boundary and the inherited PUBLIC grant.
alter function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) security invoker;
alter function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) set search_path = pg_catalog, public;
revoke all on function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) to anon, authenticated, service_role;

-- The pollution reference RPC is intentionally public through the two
-- browser roles and service_role, but not through the PUBLIC pseudo-role.
revoke all on function public.action_pollution_score_references_v2()
  from public, anon, authenticated, service_role;
grant execute on function public.action_pollution_score_references_v2()
  to anon, authenticated, service_role;
