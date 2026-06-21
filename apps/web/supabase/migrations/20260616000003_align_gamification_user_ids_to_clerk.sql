alter table public.badge_events
drop constraint if exists badge_events_user_id_fkey;

alter table public.user_points
  drop constraint if exists user_points_user_id_fkey;

alter table public.points_ledger
  drop constraint if exists points_ledger_user_id_fkey;

alter table public.user_visited_places
  drop constraint if exists user_visited_places_user_id_fkey;

drop policy if exists "Allow own access" on public.user_badge_totals;
drop policy if exists "Allow own insert" on public.badge_events;
drop policy if exists "Allow own access" on public.user_points;
drop policy if exists "Allow own read" on public.user_points;
drop policy if exists "Allow own insert" on public.points_ledger;
drop policy if exists "Allow own read" on public.points_ledger;
drop policy if exists "Allow own access" on public.user_visited_places;
drop policy if exists "Allow own insert" on public.user_visited_places;

alter table public.user_badge_totals
  alter column user_id type text using user_id::text;

alter table public.user_points
  alter column user_id type text using user_id::text;

alter table public.badge_events
  alter column user_id type text using user_id::text;

alter table public.points_ledger
  alter column user_id type text using user_id::text;

alter table public.user_visited_places
  alter column user_id type text using user_id::text;

alter table public.badge_events
  add constraint badge_events_user_id_fkey
  foreign key (user_id) references public.user_badge_totals(user_id) on delete cascade;

alter table public.points_ledger
  add constraint points_ledger_user_id_fkey
  foreign key (user_id) references public.user_points(user_id) on delete cascade;

alter table public.user_visited_places
  add constraint user_visited_places_user_id_fkey
  foreign key (user_id) references public.user_badge_totals(user_id) on delete cascade;

alter table public.user_badge_totals enable row level security;
drop policy if exists "Allow own access" on public.user_badge_totals;
create policy "Allow own access" on public.user_badge_totals
  for all
  using (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  )
  with check (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  );

alter table public.badge_events enable row level security;
drop policy if exists "Allow own insert" on public.badge_events;
create policy "Allow own insert" on public.badge_events
  for all
  using (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  )
  with check (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  );

alter table public.user_points enable row level security;
drop policy if exists "Allow own access" on public.user_points;
drop policy if exists "Allow own read" on public.user_points;
create policy "Allow own access" on public.user_points
  for all
  using (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  )
  with check (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  );

alter table public.points_ledger enable row level security;
drop policy if exists "Allow own insert" on public.points_ledger;
drop policy if exists "Allow own read" on public.points_ledger;
create policy "Allow own access" on public.points_ledger
  for all
  using (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  )
  with check (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  );

alter table public.user_visited_places enable row level security;
drop policy if exists "Allow own access" on public.user_visited_places;
drop policy if exists "Allow own insert" on public.user_visited_places;
create policy "Allow own access" on public.user_visited_places
  for all
  using (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  )
  with check (
    auth.role() = 'service_role'
    or user_id = coalesce(auth.jwt() ->> 'sub', '')
  );
