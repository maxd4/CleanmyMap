alter table public.actions
  add column if not exists derived_geometry_kind text
  check (derived_geometry_kind in ('point', 'polyline', 'polygon')),
  add column if not exists derived_geometry_geojson text,
  add column if not exists geometry_confidence double precision
  check (geometry_confidence is null or (geometry_confidence >= 0 and geometry_confidence <= 1));

alter table public.spots
  add column if not exists derived_geometry_kind text
  check (derived_geometry_kind in ('point', 'polyline', 'polygon')),
  add column if not exists derived_geometry_geojson text,
  add column if not exists geometry_confidence double precision
  check (geometry_confidence is null or (geometry_confidence >= 0 and geometry_confidence <= 1));

create index if not exists idx_actions_derived_geometry_kind
  on public.actions(derived_geometry_kind);

create index if not exists idx_spots_derived_geometry_kind
  on public.spots(derived_geometry_kind);
