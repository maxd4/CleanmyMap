create table public.missions (
  id uuid primary key default gen_random_uuid(),
  volunteer_id text references public.profiles(id),
  created_by text references public.profiles(id),
  label text not null,
  status text not null default 'pending'
    check (status in ('pending','tracking','completed','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  distance_m integer,
  duration_s integer,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.missions enable row level security;

-- La bénévole voit ses missions
create policy "volunteer_read_missions" on public.missions
  for select using (auth.uid()::text = volunteer_id);

-- L'app mobile peut update status/started_at/ended_at
create policy "volunteer_update_missions" on public.missions
  for update using (auth.uid()::text = volunteer_id)
  with check (auth.uid()::text = volunteer_id);

create table public.gps_points (
  id bigint primary key generated always as identity,
  mission_id uuid not null references public.missions(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m real,
  altitude_m real,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index pour récupérer les points d'une mission rapidement
create index idx_gps_points_mission on public.gps_points(mission_id, recorded_at);

-- RLS
alter table public.gps_points enable row level security;

-- L'app insère des points pour les missions de la bénévole
create policy "volunteer_insert_gps" on public.gps_points
  for insert with check (
    exists (
      select 1 from public.missions
      where id = mission_id and volunteer_id = auth.uid()::text
    )
  );

-- Lecture par la bénévole et les admins
create policy "volunteer_read_gps" on public.gps_points
  for select using (
    exists (
      select 1 from public.missions
      where id = mission_id and volunteer_id = auth.uid()::text
    )
  );

-- Fonction Haversine pour calculer la distance totale d'une mission
create or replace function public.compute_mission_distance(p_mission_id uuid)
returns integer as $$
declare
  total_m double precision := 0;
  prev record;
  curr record;
begin
  for curr in
    select latitude, longitude, recorded_at
    from public.gps_points
    where mission_id = p_mission_id
    order by recorded_at
  loop
    if prev is not null then
      total_m := total_m + (
        6371000 * 2 * asin(sqrt(
          sin(radians(curr.latitude - prev.latitude) / 2) ^ 2 +
          cos(radians(prev.latitude)) * cos(radians(curr.latitude)) *
          sin(radians(curr.longitude - prev.longitude) / 2) ^ 2
        ))
      );
    end if;
    prev := curr;
  end loop;

  update public.missions
  set distance_m = total_m::integer,
      duration_s = extract(epoch from (ended_at - started_at))::integer
  where id = p_mission_id;

  return total_m::integer;
end;
$$ language plpgsql security invoker set search_path = pg_catalog;

revoke all on function public.compute_mission_distance(uuid) from public;
grant execute on function public.compute_mission_distance(uuid) to service_role;
