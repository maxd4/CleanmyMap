-- 20261016000006_action_creation_idempotency.sql
-- A retry key is transport metadata, scoped to the authenticated creator.
-- It is intentionally nullable so historical and non-retry clients remain
-- compatible; the partial unique index protects only explicit retries.

alter table public.actions
  add column if not exists client_request_id text;

create unique index if not exists idx_actions_creator_client_request
  on public.actions (created_by_clerk_id, client_request_id)
  where client_request_id is not null;
