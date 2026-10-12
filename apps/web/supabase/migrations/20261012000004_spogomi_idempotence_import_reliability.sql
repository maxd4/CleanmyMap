-- SPOGOMI lot 2 corrective migration: durable reservations, recovery leases and
-- server-replayed roster confirmations. Published migrations remain unchanged.

alter table public.spogomi_event_creation_attempts
  add column intention_fingerprint text
    check (intention_fingerprint is null or intention_fingerprint ~ '^[0-9a-f]{64}$'),
  add column processing_token text,
  add column processing_started_at timestamptz;

alter table public.spogomi_roster_imports
  drop constraint spogomi_roster_imports_status_check,
  add constraint spogomi_roster_imports_status_check
    check (status in ('previewed', 'processing', 'confirmed', 'failed', 'failed_recoverable')),
  add column processing_token text,
  add column processing_started_at timestamptz;

-- The first migration used a partial unique index. The same key is safe for
-- all rows because PostgreSQL treats NULL source row numbers as distinct, and
-- a full unique index permits the upsert used by a recovery attempt.
drop index public.spogomi_participants_import_row_unique;
create unique index spogomi_participants_import_row_unique
  on public.spogomi_participants(event_id, roster_import_id, source_row_number)
  where roster_import_id is not null;

-- This is correlation metadata owned by the SPOGOMI creation workflow. It is
-- not a second action identity and is never part of public action projections.
create unique index actions_spogomi_creation_key_unique
  on public.actions ((preparation_data ->> 'spogomiCreationKey'))
  where preparation_data ? 'spogomiCreationKey';

comment on column public.spogomi_event_creation_attempts.intention_fingerprint is
  'Server fingerprint of the immutable create intent; a reused key with another payload is rejected.';
comment on column public.spogomi_event_creation_attempts.processing_token is
  'Short-lived server lease preventing concurrent irreversible work for one idempotency key.';
comment on column public.spogomi_roster_imports.processing_token is
  'Short-lived server lease preventing concurrent participant insertion for one file and mapping.';
