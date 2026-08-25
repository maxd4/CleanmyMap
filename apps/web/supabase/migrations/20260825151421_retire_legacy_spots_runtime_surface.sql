-- Retire the legacy public.spots runtime surface without dropping its archive.
--
-- public.spots remains available to the service-role maintenance/export paths
-- for read-only archive access. No data or table definition is changed here.

drop function if exists public.create_spot_with_progression(
  text,
  text,
  text,
  double precision,
  double precision,
  text
);

drop policy if exists spots_insert_authenticated on public.spots;
drop policy if exists spots_update_owner on public.spots;
drop policy if exists spots_select_all on public.spots;

revoke all privileges on table public.spots from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.spots
  from service_role;
grant select on table public.spots to service_role;

alter table public.spots enable row level security;
