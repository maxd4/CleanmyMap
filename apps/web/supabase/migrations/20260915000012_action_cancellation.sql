-- Cancellation is a terminal tombstone for a published future pre-action.
-- Existing action references, participants and conversations are retained.

alter table public.actions
  drop constraint if exists actions_status_check;

alter table public.actions
  add constraint actions_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

alter table public.actions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_clerk_id text,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_from_status text;

alter table public.actions
  add constraint actions_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      'weather',
      'organizer_unavailable',
      'authorization_logistics',
      'insufficient_participants',
      'moved',
      'other'
    )
  );

alter table public.actions
  add constraint actions_cancellation_state_check
  check (
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by_clerk_id is not null
      and cancelled_from_status in ('pending', 'approved')
    )
    or (
      status <> 'cancelled'
      and cancelled_at is null
      and cancelled_by_clerk_id is null
      and cancellation_reason is null
      and cancelled_from_status is null
    )
  );

create index if not exists idx_actions_cancelled_at
  on public.actions(cancelled_at);

create or replace function public.prevent_action_cancellation_reversal()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Cancelled actions are terminal tombstones';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_action_cancellation_reversal on public.actions;
create trigger trg_prevent_action_cancellation_reversal
before update on public.actions
for each row execute procedure public.prevent_action_cancellation_reversal();
