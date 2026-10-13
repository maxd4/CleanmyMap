-- Stable mobile point identity is nullable for historical rows, but unique for
-- every new point so a lost acknowledgement can be retried safely.
alter table public.gps_points
  add column if not exists client_point_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gps_points_client_point_id_format'
      and conrelid = 'public.gps_points'::regclass
  ) then
    alter table public.gps_points
      add constraint gps_points_client_point_id_format
      check (client_point_id is null or client_point_id ~ '^[A-Za-z0-9._:-]{1,160}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gps_points_mission_client_point_id_unique'
      and conrelid = 'public.gps_points'::regclass
  ) then
    alter table public.gps_points
      add constraint gps_points_mission_client_point_id_unique
      unique (mission_id, client_point_id);
  end if;
end;
$$;

comment on column public.gps_points.client_point_id is
  'Stable owner-created identity used to make mobile inserts and retries idempotent; NULL is retained for historical rows.';
