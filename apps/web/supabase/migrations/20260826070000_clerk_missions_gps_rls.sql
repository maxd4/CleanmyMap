-- Align the companion mission/GPS RLS contract with Clerk Third-Party Auth.
-- The historical companion migration remains unchanged; this migration replaces
-- its runtime policies and bounds the authenticated mobile update surface.

alter table public.missions enable row level security;
alter table public.gps_points enable row level security;

drop policy if exists "volunteer_read_missions" on public.missions;
drop policy if exists "volunteer_update_missions" on public.missions;
drop policy if exists "volunteer_insert_gps" on public.gps_points;
drop policy if exists "volunteer_read_gps" on public.gps_points;

create policy "volunteer_read_missions" on public.missions
  for select
  to authenticated
  using (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

create policy "volunteer_update_missions" on public.missions
  for update
  to authenticated
  using (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
  with check (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

create policy "volunteer_insert_gps" on public.gps_points
  for insert
  to authenticated
  with check (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and exists (
      select 1
      from public.missions as m
      where m.id = gps_points.mission_id
        and m.volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  );

create policy "volunteer_read_gps" on public.gps_points
  for select
  to authenticated
  using (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and exists (
      select 1
      from public.missions as m
      where m.id = gps_points.mission_id
        and m.volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
    )
  );

-- Revoke inherited client grants before declaring the exact mobile contract.
-- service_role keeps the server-side operational surface unchanged.
revoke all privileges on table public.missions, public.gps_points from public, anon, authenticated;

grant select on table public.missions to authenticated;
grant update (status, started_at, ended_at) on table public.missions to authenticated;
grant select, insert on table public.gps_points to authenticated;

grant all privileges on table public.missions, public.gps_points to service_role;
