-- PURPOSE: persist only the safe, voluntary public projection of a report PDF.
-- CALLER: server-side publication routes through the service role only.
-- AUTHORIZATION_BOUNDARY: ownership and projection checks remain server-side;
-- RLS denies direct authenticated/anonymous table access.
-- IDEMPOTENCY: one active publication record per immutable generation.
-- ATOMICITY: publication metadata is inserted/updated in one row.
-- FAILURE_BEHAVIOR: a failed projection or artifact check never writes a row.
-- SEARCH_PATH: no SECURITY DEFINER function is introduced.
-- GRANTS: only service_role receives table privileges.

create table if not exists public.report_generation_publications (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references public.report_generations(id) on delete cascade,
  artifact_id uuid not null references public.report_generation_pdf_artifacts(id),
  created_by_clerk_id text not null,
  title text not null check (length(btrim(title)) between 1 and 240),
  period_id text not null check (period_id in (
    'thirty_days', 'three_months', 'six_months', 'twelve_months',
    'current_year', 'full_history', 'custom_range'
  )),
  scope_label text not null check (length(btrim(scope_label)) between 1 and 240),
  theme text not null check (theme in ('impact', 'scientific')),
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  public_author_label text,
  constraint report_generation_publications_owner_consistency
    check (length(btrim(created_by_clerk_id)) > 0),
  constraint report_generation_publications_author_label_safe
    check (public_author_label is null or length(btrim(public_author_label)) between 1 and 120)
);

create index if not exists report_generation_publications_active_date_idx
  on public.report_generation_publications (published_at desc, id desc)
  where revoked_at is null;
create index if not exists report_generation_publications_active_theme_idx
  on public.report_generation_publications (theme, published_at desc)
  where revoked_at is null;
create index if not exists report_generation_publications_active_period_idx
  on public.report_generation_publications (period_id, published_at desc)
  where revoked_at is null;
create index if not exists report_generation_publications_active_title_idx
  on public.report_generation_publications (lower(title))
  where revoked_at is null;
create index if not exists report_generation_publications_owner_idx
  on public.report_generation_publications (created_by_clerk_id, generation_id);

alter table public.report_generation_publications enable row level security;
revoke all on public.report_generation_publications from anon, authenticated, public;
grant select, insert, update on public.report_generation_publications to service_role;
