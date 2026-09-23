-- Make idempotence follow the logical progression event, not a date or a source alone.
-- The source, event type, phase, and user are all part of the event identity.

drop index if exists public.uq_progression_events_daily_by_type;
drop index if exists public.uq_progression_events_source_phase;
drop index if exists public.uq_progression_events_user_source;

create unique index if not exists uq_progression_events_logical_identity
  on public.progression_events (
    user_id,
    event_type,
    source_table,
    source_id,
    status_phase
  );

-- Retain useful lookup paths without reintroducing broad uniqueness rules.
create index if not exists idx_progression_events_user_type_occurred_on
  on public.progression_events (user_id, event_type, occurred_on);

create index if not exists idx_progression_events_type_source_phase
  on public.progression_events (event_type, source_id, status_phase);

create index if not exists idx_progression_events_user_source
  on public.progression_events (user_id, source_table, source_id);
