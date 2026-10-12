-- SPOGOMI result-item mutation isolation.
--
-- PURPOSE: keep regulation locks event-wide while limiting measurement locks to
-- the owning submission version.
-- CALLER: trigger execution from the existing category-rule and result-item
-- guards; writes remain behind the existing service_role RPC boundary.
-- AUTHORIZATION_BOUNDARY: preserve SECURITY INVOKER, RLS and existing grants.
-- IDEMPOTENCY: replacing the trigger function is replay-safe and changes no data.
-- ATOMICITY: the owning submission row is locked before an item mutation is
-- accepted, so review and item writes serialize on the same team submission.
-- FAILURE_BEHAVIOR: non-draft items and cross-submission moves fail closed.
-- SEARCH_PATH: explicitly pg_catalog, public.
-- GRANTS: trigger-only function; existing RPC grants are unchanged.

create or replace function public.prevent_spogomi_rule_or_measure_change_after_submission()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_id uuid;
  v_submission_id uuid;
  v_submission_status text;
begin
  if tg_table_name = 'spogomi_result_items' then
    if tg_op = 'UPDATE'
       and (old.event_id is distinct from new.event_id
         or old.submission_id is distinct from new.submission_id) then
      raise exception using
        errcode = 'check_violation',
        message = 'A SPOGOMI result item cannot move between events or submissions';
    end if;

    if tg_op = 'DELETE' then
      v_event_id := old.event_id;
      v_submission_id := old.submission_id;
    else
      v_event_id := new.event_id;
      v_submission_id := new.submission_id;
    end if;

    select rs.status
      into v_submission_status
      from public.spogomi_result_submissions rs
     where rs.id = v_submission_id
       and rs.event_id = v_event_id
     for update;

    if not found then
      raise exception using
        errcode = 'foreign_key_violation',
        message = 'The SPOGOMI result item owner submission is invalid';
    end if;

    if v_submission_status <> 'draft' then
      raise exception using
        errcode = 'serialization_failure',
        message = 'Only draft SPOGOMI result submissions can change measurements';
    end if;

    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Regulation category rules remain protected at event scope: a submitted,
  -- provisional or certified result freezes the regulation for that event.
  if tg_op = 'DELETE' then
    v_event_id := old.event_id;
  else
    v_event_id := new.event_id;
  end if;

  if exists (
    select 1
      from public.spogomi_result_submissions rs
     where rs.event_id = v_event_id
       and rs.status in ('submitted', 'provisional', 'certified')
  ) then
    raise exception using
      errcode = 'serialization_failure',
      message = 'Current SPOGOMI results lock regulation changes';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
