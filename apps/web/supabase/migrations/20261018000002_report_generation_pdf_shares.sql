-- Explicit, revocable bearer links for already-rendered historical Report PDFs.
-- The token is never stored in clear text and the PDF remains in private Storage.
create table if not exists public.report_generation_pdf_shares (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.report_generations(id) on delete cascade,
  artifact_id uuid not null references public.report_generation_pdf_artifacts(id) on delete cascade,
  created_by_clerk_id text not null,
  theme text not null check (theme in ('impact', 'scientific')),
  renderer_version text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_generation_pdf_shares_created_by_not_empty check (btrim(created_by_clerk_id) <> ''),
  constraint report_generation_pdf_shares_renderer_not_empty check (btrim(renderer_version) <> ''),
  constraint report_generation_pdf_shares_token_hash_sha256 check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint report_generation_pdf_shares_expiry_after_creation check (expires_at > created_at)
);

create index if not exists idx_report_generation_pdf_shares_owner
  on public.report_generation_pdf_shares (created_by_clerk_id, generation_id, created_at desc);

create index if not exists idx_report_generation_pdf_shares_expiry
  on public.report_generation_pdf_shares (expires_at)
  where revoked_at is null;

alter table public.report_generation_pdf_shares enable row level security;

drop policy if exists report_generation_pdf_shares_service_only on public.report_generation_pdf_shares;
create policy report_generation_pdf_shares_service_only
on public.report_generation_pdf_shares
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

revoke all on table public.report_generation_pdf_shares from public, anon, authenticated;
grant select, insert, update on table public.report_generation_pdf_shares to service_role;
