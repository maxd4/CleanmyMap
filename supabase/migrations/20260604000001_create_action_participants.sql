create table if not exists public.action_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id text not null,
  constraint action_participants_action_user_unique unique (action_id, user_id)
);

create index if not exists action_participants_action_id_idx
  on public.action_participants (action_id);

create index if not exists action_participants_user_id_idx
  on public.action_participants (user_id);

alter table public.action_participants enable row level security;

drop policy if exists action_participants_service_only on public.action_participants;
create policy action_participants_service_only
on public.action_participants
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
