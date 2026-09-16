alter table public.actions
  drop constraint if exists actions_geometry_source_check;

alter table public.actions
  add constraint actions_geometry_source_check
  check (geometry_source in ('manual', 'reference', 'routed', 'estimated_route', 'estimated_area', 'fallback_point', 'gpx_import'));
