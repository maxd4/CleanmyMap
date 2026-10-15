-- SECURITY/PERF-ADVISORY-02: initialize Auth helpers once per statement and
-- keep server-only SPOGOMI policies out of client roles.
--
-- PURPOSE: resolve the 18 targeted auth_rls_initplan findings and the 42
-- multiple_permissive_policies findings without changing predicates.
-- CALLER: service_role is the only caller of the server-only SPOGOMI tables;
-- organizer reads remain governed by their existing organizer policies.
-- AUTHORIZATION_BOUNDARY: service-only policies are explicitly scoped to
-- service_role; no anon/authenticated write capability is added.
-- IDEMPOTENCY: ALTER POLICY statements are replay-safe in the migration path.
-- ATOMICITY: all policy changes commit or roll back with the migration.
-- FAILURE_BEHAVIOR: predicates are preserved; a failed ALTER leaves the
-- preceding migration state unchanged.
-- SEARCH_PATH: policy expressions use schema-qualified application functions.
-- GRANTS: table grants are unchanged; only policy roles and Auth evaluation
-- shape are corrected.

alter policy spogomi_identity_assistance_requests_service_only
  on public.spogomi_identity_assistance_requests
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_identity_assistance_request_events_service_only
  on public.spogomi_identity_assistance_request_events
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_identity_assistance_invitations_service_only
  on public.spogomi_identity_assistance_invitations
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_team_join_requests_service_only
  on public.spogomi_team_join_requests
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_team_join_request_events_service_only
  on public.spogomi_team_join_request_events
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_events_service_write
  on public.spogomi_events
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_teams_service_write
  on public.spogomi_teams
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_result_items_service_write
  on public.spogomi_result_items
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_event_routes_service_write
  on public.spogomi_event_routes
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_team_access_grants_service_only
  on public.spogomi_team_access_grants
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_team_access_sessions_service_only
  on public.spogomi_team_access_sessions
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_result_audit_events_service_append
  on public.spogomi_result_audit_events
  to service_role
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_participants_service_only
  on public.spogomi_participants
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_category_rules_service_write
  on public.spogomi_category_rules
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_result_submissions_service_write
  on public.spogomi_result_submissions
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_result_reviews_service_append
  on public.spogomi_result_reviews
  to service_role
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_event_reviewers_service_only
  on public.spogomi_event_reviewers
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

alter policy spogomi_divisions_service_write
  on public.spogomi_divisions
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
