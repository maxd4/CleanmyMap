create table if not exists public.trash_spotter_spots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_clerk_id text not null,
  user_id text not null,
  label text not null,
  spot_type text not null default 'spot',
  latitude double precision,
  longitude double precision,
  derived_geometry_kind text,
  derived_geometry_geojson text,
  geometry_confidence double precision,
  geometry_source text,
  status text not null default 'new',
  notes text,
  validated_at timestamptz,
  cleaned_at timestamptz,
  constraint trash_spotter_spots_spot_type_check
    check (spot_type in ('spot', 'clean_place')),
  constraint trash_spotter_spots_status_check
    check (status in ('new', 'validated', 'cleaned')),
  constraint trash_spotter_spots_geometry_kind_check
    check (derived_geometry_kind is null or derived_geometry_kind in ('point', 'polyline', 'polygon'))
);

create index if not exists trash_spotter_spots_created_at_idx
  on public.trash_spotter_spots (created_at desc);

create index if not exists trash_spotter_spots_user_id_idx
  on public.trash_spotter_spots (user_id);

create index if not exists trash_spotter_spots_created_by_idx
  on public.trash_spotter_spots (created_by_clerk_id);

create index if not exists trash_spotter_spots_status_idx
  on public.trash_spotter_spots (status);

create index if not exists trash_spotter_spots_spot_type_idx
  on public.trash_spotter_spots (spot_type);

alter table public.trash_spotter_spots enable row level security;

drop policy if exists trash_spotter_spots_public_read on public.trash_spotter_spots;
create policy trash_spotter_spots_public_read
on public.trash_spotter_spots
for select
using (true);
