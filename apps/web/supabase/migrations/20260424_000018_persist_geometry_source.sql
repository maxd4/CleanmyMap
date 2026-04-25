alter table public.actions
  add column if not exists geometry_source text
  check (geometry_source in ('manual', 'reference', 'routed', 'estimated_area', 'fallback_point'));

alter table public.spots
  add column if not exists geometry_source text
  check (geometry_source in ('manual', 'reference', 'routed', 'estimated_area', 'fallback_point'));
