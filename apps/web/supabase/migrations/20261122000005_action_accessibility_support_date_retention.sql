-- PURPOSE: keep private request retention aligned when an action date changes.
-- DATA_BOUNDARY: expired private requests are deleted; remaining requests inherit the new 90-day deadline.
-- ATOMICITY: action and request retention changes share the action update transaction.
-- SEARCH_PATH: fixed to trusted schemas; trigger function is not directly executable by browser roles.

begin;

-- Serialize request creation with action-date changes so a concurrent insert
-- cannot retain an expiry calculated from the superseded action date.
create or replace function public.set_action_accessibility_support_retention()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_action_date date;
begin
  select a.action_date into v_action_date
  from public.actions a
  where a.id = new.action_id
  for update;

  if v_action_date is null then
    raise exception 'action_accessibility_support_action_not_found' using errcode = '23503';
  end if;

  new.retention_expires_at := ((v_action_date + 90)::timestamp at time zone 'UTC');
  return new;
end;
$$;

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
    and v_expires_at <= request.created_at;

  update public.action_accessibility_support_requests request
  set retention_expires_at = v_expires_at
  where request.action_id = new.id;

  return new;
end;
$$;

revoke all on function public.reconcile_action_accessibility_support_retention() from public, anon, authenticated;

drop trigger if exists action_accessibility_support_action_date_retention on public.actions;
create trigger action_accessibility_support_action_date_retention
  after update of action_date on public.actions
  for each row execute function public.reconcile_action_accessibility_support_retention();

commit;
