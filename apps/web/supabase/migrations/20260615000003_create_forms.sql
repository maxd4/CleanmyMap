create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  action_id uuid not null references public.actions(id) on delete cascade,
  group_id text,
  status text not null default 'draft' check (status in ('draft', 'validated', 'deleted', 'incomplete')),
  validated_by_admin boolean not null default false,
  is_duplicate boolean not null default false,
  is_deleted boolean not null default false,
  is_test boolean not null default false
);

create index if not exists idx_forms_action_id
  on public.forms(action_id);

create index if not exists idx_forms_action_group_status
  on public.forms(action_id, group_id, status);

alter table public.forms enable row level security;

drop trigger if exists tr_forms_updated_at on public.forms;
create trigger tr_forms_updated_at
  before update on public.forms
  for each row
  execute function public.handle_updated_at();
