-- Expose mission distance finalization to the Clerk owner without widening
-- direct authenticated UPDATE access to derived mission columns.
-- Historical migrations remain unchanged.

create or replace function public.compute_mission_distance(p_mission_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_sub text := coalesce((select auth.jwt()) ->> 'sub', '');
  v_role text := coalesce((select auth.role()), '');
  v_started_at timestamptz;
  v_ended_at timestamptz;
  total_m double precision := 0;
  prev_lat double precision;
  prev_lon double precision;
  curr record;
begin
  if p_mission_id is null then
    raise exception 'Mission inaccessible.' using errcode = '42501';
  end if;

  if v_role not in ('authenticated', 'service_role') then
    raise exception 'Authenticated role required.' using errcode = '42501';
  end if;

  if v_role = 'service_role' then
    select started_at, ended_at
      into v_started_at, v_ended_at
      from public.missions
     where id = p_mission_id
     for update;
  else
    if v_sub = '' then
      raise exception 'Clerk subject required.' using errcode = '42501';
    end if;

    select started_at, ended_at
      into v_started_at, v_ended_at
      from public.missions
     where id = p_mission_id
       and volunteer_id = v_sub
     for update;
  end if;

  if not found then
    raise exception 'Mission inaccessible.' using errcode = '42501';
  end if;

  for curr in
    select latitude, longitude, recorded_at
      from public.gps_points
     where mission_id = p_mission_id
     order by recorded_at
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

  if v_role = 'service_role' then
    update public.missions
       set distance_m = total_m::integer,
           duration_s = case
             when v_started_at is not null
              and v_ended_at is not null
              and v_ended_at >= v_started_at
             then extract(epoch from (v_ended_at - v_started_at))::integer
             else null
           end
     where id = p_mission_id;
  else
    update public.missions
       set distance_m = total_m::integer,
           duration_s = case
             when v_started_at is not null
              and v_ended_at is not null
              and v_ended_at >= v_started_at
             then extract(epoch from (v_ended_at - v_started_at))::integer
             else null
           end
     where id = p_mission_id
       and volunteer_id = v_sub;
  end if;

  if not found then
    raise exception 'Mission inaccessible.' using errcode = '42501';
  end if;

  return total_m::integer;
end;
$$;

revoke all on function public.compute_mission_distance(uuid) from public, anon, authenticated;
grant execute on function public.compute_mission_distance(uuid) to authenticated, service_role;
