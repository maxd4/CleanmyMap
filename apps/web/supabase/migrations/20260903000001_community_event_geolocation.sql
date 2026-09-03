-- Community events keep their human-readable label while optionally carrying
-- a precise, provenance-bearing point for distance calculations.
alter table public.community_events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_source text;

alter table public.community_events
  drop constraint if exists community_events_coordinates_pair_check;

alter table public.community_events
  add constraint community_events_coordinates_pair_check
  check (
    (latitude is null and longitude is null and location_source is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
      and location_source in ('manual', 'import')
    )
  );

create index if not exists idx_community_events_geolocated_date
  on public.community_events (event_date, latitude, longitude)
  where latitude is not null and longitude is not null;
