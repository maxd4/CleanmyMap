-- Cache metadata for immutable PDF artifacts derived from report snapshots.
-- The binary remains in the private reports Storage bucket.
create table if not exists public.report_generation_pdf_artifacts (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.report_generations(id),
  created_by_clerk_id text not null,
  theme text not null check (theme in ('impact', 'scientific')),
  renderer_version text not null,
  storage_path text not null,
  status text not null check (status in ('rendering', 'ready', 'failed')),
  byte_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_error_code text,
  constraint report_generation_pdf_artifacts_created_by_not_empty check (btrim(created_by_clerk_id) <> ''),
  constraint report_generation_pdf_artifacts_renderer_not_empty check (btrim(renderer_version) <> ''),
  constraint report_generation_pdf_artifacts_path_not_empty check (btrim(storage_path) <> ''),
  constraint report_generation_pdf_artifacts_ready_size check (status <> 'ready' or byte_size is not null and byte_size > 0),
  constraint report_generation_pdf_artifacts_unique_variant unique (generation_id, theme, renderer_version)
);

create index if not exists idx_report_generation_pdf_artifacts_owner
  on public.report_generation_pdf_artifacts (created_by_clerk_id, created_at desc);

alter table public.report_generation_pdf_artifacts enable row level security;

drop policy if exists report_generation_pdf_artifacts_service_only on public.report_generation_pdf_artifacts;
create policy report_generation_pdf_artifacts_service_only
on public.report_generation_pdf_artifacts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

revoke all on table public.report_generation_pdf_artifacts from anon, authenticated;
grant select, insert, update on table public.report_generation_pdf_artifacts to service_role;
