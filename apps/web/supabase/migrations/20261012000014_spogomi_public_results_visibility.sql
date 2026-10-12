-- SPOGOMI lot 8: explicit publication boundary for public result projections.
-- Existing events remain hidden until an organizer opts into a result view.

alter table public.spogomi_events
  add column if not exists public_results_visibility text not null default 'hidden'
    check (public_results_visibility in ('hidden', 'provisional', 'certified'));

comment on column public.spogomi_events.public_results_visibility is
  'Public result projection: hidden, submitted results marked provisional, or certified results only.';
