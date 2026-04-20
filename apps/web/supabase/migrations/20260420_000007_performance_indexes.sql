-- Database Performance Optimization - Indexes

-- ACTIONS
create index if not exists idx_actions_lat_lng on public.actions(latitude, longitude);

-- SPOTS
create index if not exists idx_spots_lat_lng on public.spots(latitude, longitude);
create index if not exists idx_spots_status on public.spots(status);
create index if not exists idx_spots_created_by on public.spots(created_by_clerk_id);
create index if not exists idx_spots_waste_type on public.spots(waste_type);

-- COMMUNITY EVENTS
create index if not exists idx_community_events_date on public.community_events(event_date desc);
create index if not exists idx_community_events_organizer on public.community_events(organizer_clerk_id);

-- EVENT RSVPS
create index if not exists idx_event_rsvps_event_id on public.event_rsvps(event_id);
create index if not exists idx_event_rsvps_participant on public.event_rsvps(participant_clerk_id);
