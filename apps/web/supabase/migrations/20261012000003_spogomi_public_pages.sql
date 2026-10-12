-- SPOGOMI lot 3: stable public URL and explicit publication boundary.
-- Existing events remain private by default. Public reads stay server-side and
-- must use the bounded projection in the application layer.

alter table public.spogomi_events
  add column event_slug text,
  add column public_visibility text not null default 'private'
    check (public_visibility in ('private', 'published'));

alter table public.spogomi_events
  add constraint spogomi_events_event_slug_format_check
  check (event_slug is null or event_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index spogomi_events_event_slug_unique
  on public.spogomi_events(event_slug)
  where event_slug is not null;

create index spogomi_events_public_visibility_idx
  on public.spogomi_events(public_visibility, starts_at)
  where public_visibility = 'published';

comment on column public.spogomi_events.event_slug is
  'Stable canonical public URL identifier. It is not regenerated when the event name changes.';
comment on column public.spogomi_events.public_visibility is
  'Explicit public publication boundary. private rows are never exposed by public SPOGOMI projections.';
