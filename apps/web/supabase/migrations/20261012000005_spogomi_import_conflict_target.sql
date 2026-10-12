-- SPOGOMI lot 2 micro-correction: make the participant import conflict target
-- inferable by PostgreSQL for the existing upsert contract.
-- Published migrations remain unchanged; NULL values for legacy/non-import
-- participants remain distinct under PostgreSQL's default NULLS DISTINCT rule.

drop index public.spogomi_participants_import_row_unique;

create unique index spogomi_participants_import_row_unique
  on public.spogomi_participants(event_id, roster_import_id, source_row_number);
