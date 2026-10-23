-- PURPOSE: close direct public reads of community_events internal columns.
-- CALLER: GET /api/community/events and other authorized server-side readers.
-- AUTHORIZATION_BOUNDARY: anon/authenticated use HTTP projections; service_role
--   remains server-only and is bounded by its server-side query/DTO owner.
-- IDEMPOTENCY: REVOKE/DROP/GRANT operations are safe to replay at the same
--   schema state and do not alter existing rows.
-- ATOMICITY: privilege and policy changes are applied in one migration.
-- FAILURE_BEHAVIOR: direct Data API SELECT fails closed for browser roles;
--   historical HTTP reads remain available through server-side projections.
-- SEARCH_PATH: no function or unqualified security helper is introduced.
-- GRANTS: only service_role retains SELECT; existing write grants are unchanged.

revoke select on table public.community_events
  from public, anon, authenticated;

drop policy if exists community_events_select_all on public.community_events;

grant select on table public.community_events to service_role;
