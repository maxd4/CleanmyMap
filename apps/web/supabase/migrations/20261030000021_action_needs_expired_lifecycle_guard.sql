-- PURPOSE: prevent an expired open action need from being reopened or fulfilled.
-- CALLER: the existing action_needs_lifecycle_guard trigger only.
-- AUTHORIZATION_BOUNDARY: table grants and RLS from 20261030000019 remain unchanged.
-- IDEMPOTENCY: forward-only CREATE OR REPLACE updates the existing trigger function.
-- ATOMICITY: each row update is rejected before persistence when its lifecycle is invalid.
-- FAILURE_BEHAVIOR: expired open rows may only transition to cancelled without other changes.
-- SEARCH_PATH: pinned to pg_catalog, public as in the published function.
-- GRANTS: no grant changes; service_role remains the only direct table writer.

create or replace function public.enforce_action_need_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.action_id is distinct from old.action_id
       or new.created_by_clerk_id is distinct from old.created_by_clerk_id
       or new.created_at is distinct from old.created_at then
      raise exception 'action_need_identity_immutable' using errcode = '23514';
    end if;

    if old.status <> 'open' then
      if new.category is distinct from old.category
         or new.title is distinct from old.title
         or new.description is distinct from old.description
         or new.quantity_label is distinct from old.quantity_label
         or new.expires_at is distinct from old.expires_at
         or new.status is distinct from old.status
         or new.fulfilled_at is distinct from old.fulfilled_at then
        raise exception 'action_need_terminal_state_immutable' using errcode = '23514';
      end if;
    elsif old.expires_at is not null and old.expires_at < now() then
      if new.status <> 'cancelled'
         or new.category is distinct from old.category
         or new.title is distinct from old.title
         or new.description is distinct from old.description
         or new.quantity_label is distinct from old.quantity_label
         or new.expires_at is distinct from old.expires_at
         or new.fulfilled_at is distinct from old.fulfilled_at then
        raise exception 'action_need_expired_state_immutable' using errcode = '23514';
      end if;
    elsif new.status not in ('open', 'fulfilled', 'cancelled') then
      raise exception 'action_need_invalid_transition' using errcode = '23514';
    end if;
  end if;

  if new.status = 'fulfilled' and new.fulfilled_at is null then
    raise exception 'action_need_fulfilled_at_required' using errcode = '23514';
  end if;
  if new.status <> 'fulfilled' and new.fulfilled_at is not null then
    raise exception 'action_need_fulfilled_at_must_be_null' using errcode = '23514';
  end if;

  return new;
end;
$$;
