-- Gamification projections and ledgers are server-owned facts.
-- Keep RLS enabled and remove every client-side DML path. The service_role
-- server client remains able to run the authorized métier mutations.

alter table public.user_points enable row level security;
alter table public.points_ledger enable row level security;
alter table public.user_badge_totals enable row level security;
alter table public.badge_events enable row level security;
alter table public.user_visited_places enable row level security;

revoke insert, update, delete, truncate on table public.user_points from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.points_ledger from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.user_badge_totals from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.badge_events from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.user_visited_places from public, anon, authenticated;

drop policy if exists "Allow own access" on public.user_points;
drop policy if exists "Allow own read" on public.user_points;
drop policy if exists "Allow own access" on public.points_ledger;
drop policy if exists "Allow own read" on public.points_ledger;
drop policy if exists "Allow own access" on public.user_badge_totals;
drop policy if exists "Allow own insert" on public.badge_events;
drop policy if exists "Allow own access" on public.user_visited_places;
drop policy if exists "Allow own insert" on public.user_visited_places;

-- This is the only direct client read currently used by the web runtime.
grant select on table public.user_visited_places to authenticated;
create policy gamification_user_visited_places_owner_select
  on public.user_visited_places
  for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
