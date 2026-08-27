-- Finalize Clerk-owned mission metrics inside the owner-authorized missions update.
-- The trigger is invoker-secure so gps_points remain subject to the caller's RLS.

create or replace function public.finalize_completed_mission_metrics()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  total_m double precision := 0;
  prev_lat double precision;
  prev_lon double precision;
  curr record;
begin
  if old.status is distinct from 'completed' and new.status = 'completed' then
    for curr in
      select latitude, longitude
        from public.gps_points
       where mission_id = new.id
       order by recorded_at, id
    loop
      if prev_lat is not null and prev_lon is not null then
        total_m := total_m + (
          6371000 * 2 * asin(sqrt(
            sin(radians(curr.latitude - prev_lat) / 2) ^ 2 +
            cos(radians(prev_lat)) * cos(radians(curr.latitude)) *
            sin(radians(curr.longitude - prev_lon) / 2) ^ 2
          ))
        );
      end if;

      prev_lat := curr.latitude;
      prev_lon := curr.longitude;
    end loop;

    new.distance_m := total_m::integer;
    new.duration_s := case
      when new.started_at is not null
       and new.ended_at is not null
       and new.ended_at >= new.started_at
      then extract(epoch from (new.ended_at - new.started_at))::integer
      else null
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists finalize_completed_mission_metrics on public.missions;

create trigger finalize_completed_mission_metrics
before update on public.missions
for each row
when (old.status is distinct from 'completed' and new.status = 'completed')
execute function public.finalize_completed_mission_metrics();

-- The mobile client now receives the metrics from the completion UPDATE.
-- Dropping the RPC removes its authenticated execution surface entirely.
drop function if exists public.compute_mission_distance(uuid);
