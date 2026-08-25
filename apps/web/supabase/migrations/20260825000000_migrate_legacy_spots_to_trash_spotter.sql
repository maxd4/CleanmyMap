-- Move historical public.spots rows into the canonical signalement table.
--
-- This migration is intentionally insert-only. public.spots remains present as
-- a legacy archive until a separate, evidence-based retirement lot.
-- The mapping table makes reruns idempotent and preserves the original UUID,
-- waste_type and notes even when a UUID already exists canonically.

create table if not exists public.legacy_spot_migrations (
  legacy_spot_id uuid primary key,
  canonical_spot_id uuid not null unique,
  legacy_waste_type text,
  legacy_notes text,
  migrated_at timestamptz not null default timezone('utc', now())
);

create index if not exists legacy_spot_migrations_canonical_spot_id_idx
  on public.legacy_spot_migrations (canonical_spot_id);

alter table public.legacy_spot_migrations enable row level security;

comment on table public.legacy_spot_migrations is
  'Insert-only provenance map for migrating public.spots rows into public.trash_spotter_spots.';

insert into public.legacy_spot_migrations (
  legacy_spot_id,
  canonical_spot_id,
  legacy_waste_type,
  legacy_notes
)
select
  s.id,
  case
    when exists (
      select 1
      from public.trash_spotter_spots canonical
      where canonical.id = s.id
    ) then gen_random_uuid()
    else s.id
  end,
  s.waste_type,
  s.notes
from public.spots s
where not exists (
  select 1
  from public.legacy_spot_migrations migration
  where migration.legacy_spot_id = s.id
);

insert into public.trash_spotter_spots (
  id,
  created_at,
  created_by_clerk_id,
  user_id,
  label,
  spot_type,
  latitude,
  longitude,
  derived_geometry_kind,
  derived_geometry_geojson,
  geometry_confidence,
  geometry_source,
  status,
  notes
)
select
  migration.canonical_spot_id,
  legacy.created_at,
  legacy.created_by_clerk_id,
  legacy.created_by_clerk_id,
  legacy.label,
  'spot',
  legacy.latitude,
  legacy.longitude,
  null,
  null,
  null,
  null,
  legacy.status,
  legacy.notes
from public.legacy_spot_migrations migration
join public.spots legacy on legacy.id = migration.legacy_spot_id
where not exists (
  select 1
  from public.trash_spotter_spots canonical
  where canonical.id = migration.canonical_spot_id
);
