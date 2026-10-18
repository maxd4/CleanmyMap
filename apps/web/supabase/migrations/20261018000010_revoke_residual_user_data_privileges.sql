-- PURPOSE: remove residual SQL capabilities from authenticated on private user-data tables.
-- CALLER: migration runner only; no application caller is introduced.
-- AUTHORIZATION_BOUNDARY: authenticated retains only the table DML needed by the owner RLS contracts.
-- IDEMPOTENCY: REVOKE statements are safe to replay through migration tooling.
-- ATOMICITY: both table privilege changes execute in the migration transaction.
-- FAILURE_BEHAVIOR: a privilege failure aborts the migration.
-- SEARCH_PATH: no function or SECURITY DEFINER boundary is introduced.
-- GRANTS: service_role privileges are untouched; only authenticated residual privileges are removed.

revoke truncate, trigger, references
on table public.event_rsvps
from authenticated;

revoke truncate, trigger, references
on table public.quiz_srs
from authenticated;
