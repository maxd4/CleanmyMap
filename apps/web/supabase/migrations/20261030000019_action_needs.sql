-- PURPOSE: establish the single persistent representation of structured help needs.
-- CALLER: future authenticated server services only; no browser Data API writes.
-- AUTHORIZATION_BOUNDARY: service_role is the only direct table writer/reader;
--   future HTTP services must resolve Clerk identity and action-manager scope first.
-- IDEMPOTENCY: migration objects use IF NOT EXISTS/drop-and-recreate for local replay.
-- ATOMICITY: table, constraints, lifecycle trigger, RLS and grants are one migration.
-- FAILURE_BEHAVIOR: any failed invariant or privilege change aborts the migration.
-- SEARCH_PATH: trigger function qualifies public objects and pins its search_path.
-- GRANTS: anon/authenticated receive no table privileges; service_role is server-only.

create table if not exists public.action_needs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  created_by_clerk_id text not null,
  category text not null,
  title text not null,
  description text not null,
  quantity_label text,
  expires_at timestamptz,
  status text not null default 'open',
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_needs_created_by_check
    check (nullif(btrim(created_by_clerk_id), '') is not null),
  constraint action_needs_category_check
    check (category in (
      'materiel',
      'transport',
      'renfort_benevole',
      'communication',
      'photo_video',
      'cartographie',
      'expertise',
      'logistique'
    )),
  constraint action_needs_title_length_check
    check (char_length(btrim(title)) between 3 and 80),
  constraint action_needs_description_length_check
    check (char_length(btrim(description)) between 1 and 500),
  constraint action_needs_quantity_label_length_check
    check (quantity_label is null or char_length(btrim(quantity_label)) <= 80),
  constraint action_needs_status_check
    check (status in ('open', 'fulfilled', 'cancelled')),
  constraint action_needs_fulfillment_consistency_check
    check (
      (status = 'fulfilled' and fulfilled_at is not null)
      or (status <> 'fulfilled' and fulfilled_at is null)
    ),
  constraint action_needs_temporal_consistency_check
    check (
      (expires_at is null or expires_at >= created_at)
      and (fulfilled_at is null or fulfilled_at >= created_at)
    )
);

create index if not exists action_needs_action_status_created_at_idx
  on public.action_needs (action_id, status, created_at desc);

create index if not exists action_needs_category_status_created_at_idx
  on public.action_needs (category, status, created_at desc);

create index if not exists action_needs_open_expires_at_idx
  on public.action_needs (expires_at)
  where status = 'open';

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

drop trigger if exists action_needs_lifecycle_guard on public.action_needs;
create trigger action_needs_lifecycle_guard
before update on public.action_needs
for each row execute function public.enforce_action_need_lifecycle();

drop trigger if exists action_needs_set_updated_at on public.action_needs;
create trigger action_needs_set_updated_at
before update on public.action_needs
for each row execute function public.set_updated_at();

alter table public.action_needs enable row level security;

drop policy if exists action_needs_service_role_select on public.action_needs;
create policy action_needs_service_role_select
on public.action_needs for select to service_role
using (true);

drop policy if exists action_needs_service_role_insert on public.action_needs;
create policy action_needs_service_role_insert
on public.action_needs for insert to service_role
with check (true);

drop policy if exists action_needs_service_role_update on public.action_needs;
create policy action_needs_service_role_update
on public.action_needs for update to service_role
using (true)
with check (true);

revoke all on table public.action_needs from public, anon, authenticated;
grant select, insert, update on table public.action_needs to service_role;

revoke all on function public.enforce_action_need_lifecycle() from public, anon, authenticated;
grant execute on function public.enforce_action_need_lifecycle() to service_role;
