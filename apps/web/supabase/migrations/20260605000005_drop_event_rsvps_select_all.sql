-- Remove the redundant public SELECT policy on event_rsvps.
-- The remaining FOR ALL policy already covers the server-side RSVP flows.

drop policy if exists event_rsvps_select_all on public.event_rsvps;
