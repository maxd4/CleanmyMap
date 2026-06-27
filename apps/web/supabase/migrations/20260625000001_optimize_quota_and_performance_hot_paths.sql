-- 20260625000001_optimize_quota_and_performance_hot_paths.sql
--
-- Optimisations structurelles sans impact UX / métier:
-- - accélérer les listes triées par date;
-- - réduire les scans sur les flux de notifications et de gamification;
-- - sécuriser le anti-doublon des écritures de points.

-- ACTIONS
create index if not exists idx_actions_status_action_date_desc
  on public.actions (status, action_date desc);

create index if not exists idx_actions_created_by_action_date_desc
  on public.actions (created_by_clerk_id, action_date desc);

create index if not exists idx_actions_created_at_desc
  on public.actions (created_at desc);

-- SPOTS
create index if not exists idx_spots_created_at_desc
  on public.spots (created_at desc);

-- COMMUNITY EVENTS
create index if not exists idx_community_events_created_at_desc
  on public.community_events (created_at desc);

-- EVENT RSVPS
create index if not exists idx_event_rsvps_updated_at_desc
  on public.event_rsvps (updated_at desc);

-- NOTIFICATIONS
create index if not exists idx_app_notifications_user_created_at_desc
  on public.app_notifications (user_id, created_at desc);

-- POINTS LEDGER
create index if not exists idx_points_ledger_user_created_at_desc
  on public.points_ledger (user_id, created_at desc);

create index if not exists idx_points_ledger_user_source
  on public.points_ledger (user_id, source_event, source_id)
  where source_event is not null
    and source_id is not null;

-- PROGRESSION EVENTS
create index if not exists idx_progression_events_created_at_desc
  on public.progression_events (created_at desc);

-- TRASH SPOTTER SPOTS
create index if not exists idx_trash_spotter_spots_created_at_desc
  on public.trash_spotter_spots (created_at desc);
