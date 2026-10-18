-- PURPOSE: close direct Data API writes to community_events.
-- CALLER: /api/community/events and /api/community/events/ops only.
-- AUTHORIZATION_BOUNDARY: Clerk authentication, ownership and admin override
--   checks remain in the server routes; browser roles receive read-only grants.
-- IDEMPOTENCY: no event creation, operations payload or notification flow changes.
-- ATOMICITY: no new multi-table mutation is introduced.
-- FAILURE_BEHAVIOR: unauthorized direct DML fails at PostgreSQL privileges;
--   public event reads remain available through the existing SELECT policy.
-- SEARCH_PATH: no function or unqualified security helper is introduced.
-- GRANTS: anon/authenticated SELECT only; service_role retains server DML.

-- Remove both table-level and any inherited browser DML grants. The explicit
-- SELECT grant below preserves the existing public event projection.
revoke all privileges on table public.community_events
  from public, anon, authenticated;

grant select on table public.community_events to anon, authenticated;
grant select, insert, update, delete on table public.community_events to service_role;

-- Table privileges are the primary boundary. Keep no owner-write policy that
-- could reopen a direct Data API mutation if a grant is accidentally restored;
-- the server routes remain the owner/admin authorization boundary.
drop policy if exists community_events_insert_authenticated on public.community_events;
drop policy if exists community_events_update_owner on public.community_events;
drop policy if exists community_events_delete_owner on public.community_events;

drop policy if exists community_events_insert_service_role on public.community_events;
create policy community_events_insert_service_role on public.community_events
for insert
to service_role
with check (true);

drop policy if exists community_events_update_service_role on public.community_events;
create policy community_events_update_service_role on public.community_events
for update
to service_role
using (true)
with check (true);

drop policy if exists community_events_delete_service_role on public.community_events;
create policy community_events_delete_service_role on public.community_events
for delete
to service_role
using (true);
