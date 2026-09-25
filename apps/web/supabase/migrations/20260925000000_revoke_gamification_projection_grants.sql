-- Gamification projections remain server-only table surfaces.
-- user_visited_places is intentionally unchanged: authenticated users still
-- need its existing owner-scoped SELECT policy.

revoke all on table public.user_points from public, anon, authenticated;
revoke all on table public.points_ledger from public, anon, authenticated;
revoke all on table public.user_badge_totals from public, anon, authenticated;
revoke all on table public.badge_events from public, anon, authenticated;
