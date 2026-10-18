-- PURPOSE: accept mobile GPS points only while an owned mission is tracking.
-- CALLER: authenticated Clerk mobile sessions insert points; service_role keeps
--         its existing server-side operational capability.
-- AUTHORIZATION_BOUNDARY: the RLS policy binds volunteer_id to auth.jwt().sub;
--         the trigger rechecks the owner and status after taking the mission row lock.
-- IDEMPOTENCY: the existing (mission_id, client_point_id) constraint and mobile
--              upsert contract remain unchanged.
-- ATOMICITY: the mission row lock serializes a point insert with finalization.
-- FAILURE_BEHAVIOR: completed/cancelled missions and missing identities fail closed;
--                   failed mobile flushes remain buffered by the client.
-- SEARCH_PATH: the trigger is SECURITY INVOKER with an explicit search_path.
-- GRANTS: authenticated keeps only the existing mobile mission/GPS grants;
--         service_role remains the privileged server path.

-- A completed or cancelled mission is terminal for the direct mobile update
-- surface. Keeping those rows out of USING prevents an owner from reopening a
-- finalized mission and then satisfying the GPS INSERT policy.
drop policy if exists "volunteer_update_missions" on public.missions;

create policy "volunteer_update_missions" on public.missions
  for update
  to authenticated
  using (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
    and status in ('pending', 'tracking')
  )
  with check (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

drop policy if exists "volunteer_insert_gps" on public.gps_points;

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
        and m.status = 'tracking'
    )
  );

-- The policy above is the authorization contract. This invoker trigger adds
-- transaction safety: an INSERT that observes tracking locks the mission row;
-- a concurrent completion therefore either waits for the point and includes it
-- in the completion metrics, or observes completed and rejects the point.
create or replace function public.guard_gps_point_mission_tracking()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_role text := coalesce((select auth.role()), '');
  v_sub text := coalesce((select auth.jwt()) ->> 'sub', '');
  v_status text;
  v_volunteer_id text;
begin
  -- Server-side backfills and operational writes retain their existing
  -- service_role capability; client writes remain subject to RLS above.
  if v_role = 'service_role' then
    return new;
  end if;

  if v_role <> 'authenticated' or v_sub = '' then
    raise exception 'GPS mission is inaccessible.' using errcode = '42501';
  end if;

  select m.status, m.volunteer_id
    into v_status, v_volunteer_id
    from public.missions as m
   where m.id = new.mission_id
   for update;

  if not found
     or v_status <> 'tracking'
     or v_volunteer_id is distinct from v_sub then
    raise exception 'GPS mission is not accepting points.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_gps_point_mission_tracking() from public, anon;
grant execute on function public.guard_gps_point_mission_tracking() to authenticated, service_role;

drop trigger if exists guard_gps_point_mission_tracking on public.gps_points;

create trigger guard_gps_point_mission_tracking
before insert on public.gps_points
for each row
execute function public.guard_gps_point_mission_tracking();
