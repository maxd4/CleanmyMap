-- 20260531000001_action_organizers.sql

create table if not exists public.action_organizers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action_id uuid not null references public.actions(id) on delete cascade,
  organizer_clerk_id text not null,
  organizer_label text not null,
  organizer_handle text,
  is_primary boolean not null default false,
  unique (action_id, organizer_clerk_id)
);

create index if not exists idx_action_organizers_action_id
  on public.action_organizers(action_id);

create index if not exists idx_action_organizers_organizer_clerk_id
  on public.action_organizers(organizer_clerk_id);

alter table public.action_organizers enable row level security;

drop policy if exists action_organizers_select_all on public.action_organizers;
create policy action_organizers_select_all
on public.action_organizers
for select
using (true);

drop policy if exists action_organizers_insert_service_role on public.action_organizers;
create policy action_organizers_insert_service_role
on public.action_organizers
for insert
with check (auth.role() = 'service_role');

drop policy if exists action_organizers_update_service_role on public.action_organizers;
create policy action_organizers_update_service_role
on public.action_organizers
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists action_organizers_delete_service_role on public.action_organizers;
create policy action_organizers_delete_service_role
on public.action_organizers
for delete
using (auth.role() = 'service_role');
