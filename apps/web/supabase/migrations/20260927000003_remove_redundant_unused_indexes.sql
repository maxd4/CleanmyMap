-- Remove only unused prefix indexes whose covering indexes are exercised by
-- the current query contracts. The three zero-scan pairs below remain until
-- a separate workload review proves that their compatibility paths are closed.
drop index if exists public.idx_actions_status;
drop index if exists public.idx_spots_status;
drop index if exists public.idx_forms_action_id;
drop index if exists public.idx_service_email_events_actor_user_id;
