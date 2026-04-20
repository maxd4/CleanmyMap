-- Hardened RLS Policies for CleanMyMap
-- This migration fills the gaps for INSERT/UPDATE/DELETE policies on core tables.

-- SPOTS
drop policy if exists spots_insert_authenticated on public.spots;
create policy spots_insert_authenticated on public.spots
for insert with check (auth.role() = 'authenticated');

drop policy if exists spots_update_owner on public.spots;
create policy spots_update_owner on public.spots
for update using (
  auth.role() = 'service_role'
  or created_by_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);

-- COMMUNITY EVENTS
drop policy if exists community_events_insert_authenticated on public.community_events;
create policy community_events_insert_authenticated on public.community_events
for insert with check (auth.role() = 'authenticated');

drop policy if exists community_events_update_owner on public.community_events;
create policy community_events_update_owner on public.community_events
for update using (
  auth.role() = 'service_role'
  or organizer_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);

-- EVENT RSVPS (Upsert support)
drop policy if exists event_rsvps_all_owner on public.event_rsvps;
create policy event_rsvps_all_owner on public.event_rsvps
for all using (
  auth.role() = 'service_role'
  or participant_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);

-- ACTIONS (Already had some policies, but adding delete protection just in case)
drop policy if exists actions_delete_owner on public.actions;
create policy actions_delete_owner on public.actions
for delete using (
  auth.role() = 'service_role'
  or created_by_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);
