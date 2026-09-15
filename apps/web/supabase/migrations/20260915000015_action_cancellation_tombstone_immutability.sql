-- A cancelled action is a historical tombstone.  The cancellation metadata,
-- action content and lifecycle state must not be changed by a generic update.
-- This is append-only; the earlier cancellation migrations are already applied.

create or replace function public.prevent_cancelled_action_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if old.status = 'cancelled'
    and to_jsonb(old) is distinct from to_jsonb(new) then
    raise exception using
      errcode = 'P0001',
      message = 'Cancelled actions are immutable historical tombstones';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_cancelled_action_mutation on public.actions;
create trigger trg_prevent_cancelled_action_mutation
before update on public.actions
for each row execute function public.prevent_cancelled_action_mutation();
