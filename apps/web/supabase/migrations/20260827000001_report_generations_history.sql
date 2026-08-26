-- Persist successful Reports PDF generations as metadata plus the final JSON payload.
-- The PDF binary remains outside this table and is not stored by this contract.

create table if not exists public.report_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generated_at timestamptz not null,
  created_by_clerk_id text not null,
  title text not null,
  filename text not null,
  period_id text not null check (period_id in ('six_months', 'current_year', 'full_history')),
  scope_kind text not null check (scope_kind in ('global', 'account', 'association', 'arrondissement')),
  scope_value text not null default '',
  scope_label text not null,
  detail_level text not null check (detail_level in ('concis', 'default', 'exhaustif')),
  modules jsonb not null,
  snapshot jsonb not null,
  constraint report_generations_created_by_not_empty check (btrim(created_by_clerk_id) <> ''),
  constraint report_generations_title_not_empty check (btrim(title) <> ''),
  constraint report_generations_filename_not_empty check (btrim(filename) <> ''),
  constraint report_generations_scope_label_not_empty check (btrim(scope_label) <> ''),
  constraint report_generations_modules_object check (jsonb_typeof(modules) = 'object'),
  constraint report_generations_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists idx_report_generations_generated_at
  on public.report_generations (generated_at desc);

alter table public.report_generations enable row level security;

drop policy if exists report_generations_service_only on public.report_generations;
create policy report_generations_service_only
on public.report_generations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

revoke all on table public.report_generations from anon, authenticated;
grant select, insert, update, delete on table public.report_generations to service_role;
