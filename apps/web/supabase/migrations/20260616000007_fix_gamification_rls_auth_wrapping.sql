drop policy if exists quiz_type_progress_owner_all on public.quiz_type_progress;
create policy quiz_type_progress_owner_all on public.quiz_type_progress
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists "Allow own access" on public.user_badge_totals;
create policy "Allow own access" on public.user_badge_totals
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists "Allow own insert" on public.badge_events;
create policy "Allow own insert" on public.badge_events
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists "Allow own access" on public.user_points;
create policy "Allow own access" on public.user_points
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists "Allow own access" on public.points_ledger;
create policy "Allow own access" on public.points_ledger
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists "Allow own access" on public.user_visited_places;
create policy "Allow own access" on public.user_visited_places
for all
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);
