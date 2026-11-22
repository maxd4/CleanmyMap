-- PURPOSE: delete private support requests as soon as a revised action date puts their expiry in the past.
-- CALLER: existing AFTER UPDATE OF action_date trigger on public.actions.
-- AUTHORIZATION_BOUNDARY: preserve the existing SECURITY DEFINER trigger function and private-table RLS/grants.
-- IDEMPOTENCY: CREATE OR REPLACE updates the existing trigger function in place.
-- ATOMICITY: request deletion and expiry updates remain in the action-date transaction.
-- FAILURE_BEHAVIOR: an update failure aborts the enclosing action-date transaction.
-- SEARCH_PATH: retain the original fixed trusted search_path.
-- GRANTS: CREATE OR REPLACE preserves function ownership and privileges; no grant changes.

begin;

create or replace function public.reconcile_action_accessibility_support_retention()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_expires_at timestamptz := ((new.action_date + 90)::timestamp at time zone 'UTC');
begin
  if new.action_date is not distinct from old.action_date then
    return new;
  end if;

  delete from public.action_accessibility_support_requests request
  where request.action_id = new.id
    and v_expires_at <= statement_timestamp();

  update public.action_accessibility_support_requests request
  set retention_expires_at = v_expires_at
  where request.action_id = new.id;

  return new;
end;
$$;

commit;
