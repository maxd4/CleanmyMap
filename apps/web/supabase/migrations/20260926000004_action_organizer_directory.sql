-- Canonical organizer registry for action creation.
-- Static verified entries keep their stable application ids; this table stores
-- user-created names without turning a fuzzy suggestion into a merge.
create table if not exists public.organizer_directory_entries (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text not null check (char_length(normalized_name) between 1 and 120),
  organizer_type text not null check (organizer_type in ('company', 'association', 'student_association', 'collective', 'other')),
  created_by_clerk_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizer_type, normalized_name)
);

create index if not exists idx_organizer_directory_entries_type_name
  on public.organizer_directory_entries(organizer_type, normalized_name);

alter table public.organizer_directory_entries enable row level security;

drop policy if exists organizer_directory_entries_select_authenticated
  on public.organizer_directory_entries;
create policy organizer_directory_entries_select_authenticated
on public.organizer_directory_entries
for select
to authenticated
using (true);

drop policy if exists organizer_directory_entries_insert_service_role
  on public.organizer_directory_entries;
create policy organizer_directory_entries_insert_service_role
on public.organizer_directory_entries
for insert
to service_role
with check (true);

alter table public.actions add column if not exists organizer_id text;
alter table public.actions add column if not exists organizer_name text;

comment on column public.actions.organizer_id is
  'Canonical organizer registry id; null for spontaneous actions.';
comment on column public.actions.organizer_name is
  'Canonical organizer label resolved for the selected organizer_type.';
