-- CANDIDATE ONLY (PLAN). Do not apply without linked Supabase preflight,
-- fresh main migration-number check, executed owner A/B RLS tests and API integration.
-- PURPOSE: private personal AI usage + personal token budget + immutable calculation snapshots.
-- CALLER: authenticated Clerk JWT through existing Supabase user-client,
--         and guarded server endpoints after Clerk auth() checks.
-- AUTHORIZATION_BOUNDARY: owner_clerk_id = verified JWT sub, RLS on all three tables.
-- IDEMPOTENCY: unique (owner_clerk_id, source_identity_key) for usage upserts.
-- DATA_MINIMIZATION: source_identity_key and content_hash are SHA-256 hex digests
-- of normalized non-content metadata, not raw platform account names or prompts.
-- ATOMICITY: multi-row imports require a separate RPC/transaction, NOT a browser loop.
-- FAILURE_BEHAVIOR: constraints reject invalid records, no fallback to public snapshots.
-- SEARCH_PATH: no SECURITY DEFINER function introduced.
-- GRANTS: anon denied; authenticated gets owner-scoped CRUD via RLS.

create table if not exists public.personal_ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null check (length(owner_clerk_id) between 1 and 256),
  source_identity_key text not null check (source_identity_key ~ '^[0-9a-f]{64}$'),
  source_provider text not null check (source_provider in (
    'manual','openai_usage','anthropic_analytics_2026','gemini_usage',
    'codex_rollout','csv_mapped','pdf_invoice'
  )),
  source_version text not null check (length(source_version) between 1 and 128),
  source_granularity text not null check (source_granularity in ('request','bucket','manual','invoice')),
  source_scope_hash text check (source_scope_hash is null or length(source_scope_hash) <= 128),
  source_content_hash text not null check (source_content_hash ~ '^[0-9a-f]{64}$'),
  period_start_utc timestamptz,
  period_end_utc timestamptz,
  model_raw text check (model_raw is null or length(model_raw) <= 160),
  model_canonical text check (model_canonical is null or length(model_canonical) <= 160),
  execution_environment text not null check (execution_environment in ('cloud_api','local_device')),
  processing_region text check (processing_region is null or length(processing_region) <= 100),
  status text not null default 'active' check(status in ('active','excluded','partial')),
  normalized_payload jsonb not null check(jsonb_typeof(normalized_payload)='object' and octet_length(normalized_payload::text)<=65536),
  normalization_version text not null check(length(normalization_version) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_ai_usage_period check(
    (period_start_utc is null and period_end_utc is null) or
    (period_start_utc is not null and period_end_utc is not null and period_start_utc < period_end_utc)
  ),
  constraint personal_ai_usage_identity unique (owner_clerk_id,source_identity_key),
  constraint personal_ai_usage_owner_id unique (owner_clerk_id,id)
);
create index if not exists personal_ai_usage_owner_period_idx on public.personal_ai_usage_records(owner_clerk_id,period_start_utc desc,id);

create table if not exists public.personal_ai_monthly_token_budgets (
  owner_clerk_id text not null check (length(owner_clerk_id) between 1 and 256),
  month_utc date not null,
  budget_tokens bigint not null check (budget_tokens>=0),
  alert_fraction numeric(5,4) not null default 0.8 check(alert_fraction between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key(owner_clerk_id,month_utc),
  constraint personal_ai_budget_month_first check(extract(day from month_utc)=1)
);

create table if not exists public.personal_ai_estimate_revisions (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null check(length(owner_clerk_id) between 1 and 256),
  usage_record_id uuid not null,
  revision integer not null check(revision>=1),
  method_version text not null check(length(method_version) between 1 and 128),
  factors_version text not null check(length(factors_version) between 1 and 128),
  estimated_payload jsonb not null check(jsonb_typeof(estimated_payload)='object' and octet_length(estimated_payload::text)<=65536),
  created_at timestamptz not null default now(),
  constraint personal_ai_revision_owner_usage_fk foreign key(owner_clerk_id,usage_record_id)
    references public.personal_ai_usage_records(owner_clerk_id,id) on delete cascade,
  constraint personal_ai_revision_unique unique(owner_clerk_id,usage_record_id,revision)
);
create index if not exists personal_ai_estimate_owner_record_idx on public.personal_ai_estimate_revisions(owner_clerk_id,usage_record_id,revision desc);

alter table public.personal_ai_usage_records enable row level security;
alter table public.personal_ai_monthly_token_budgets enable row level security;
alter table public.personal_ai_estimate_revisions enable row level security;

create policy personal_ai_usage_select on public.personal_ai_usage_records
  for select to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_usage_insert on public.personal_ai_usage_records
  for insert to authenticated with check(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_usage_update on public.personal_ai_usage_records
  for update to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''))
  with check(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_usage_delete on public.personal_ai_usage_records
  for delete to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));

create policy personal_ai_budget_select on public.personal_ai_monthly_token_budgets
  for select to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_budget_insert on public.personal_ai_monthly_token_budgets
  for insert to authenticated with check(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_budget_update on public.personal_ai_monthly_token_budgets
  for update to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''))
  with check(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
create policy personal_ai_budget_delete on public.personal_ai_monthly_token_budgets
  for delete to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));

create policy personal_ai_revision_select on public.personal_ai_estimate_revisions
  for select to authenticated using(owner_clerk_id=coalesce((select auth.jwt()) ->> 'sub',''));
-- Revision content is computed by a Clerk-guarded server path only.
-- Authenticated clients can read their own revisions but cannot forge calculation snapshots.
-- A server insertion using service_role must verify the owner against Clerk auth()
-- and compute methodology/factors on the server before writing.
-- No update or delete policy for revisions: append-only. Deletion through usage_record cascade only.

revoke all on table public.personal_ai_usage_records from public,anon;
revoke all on table public.personal_ai_monthly_token_budgets from public,anon;
revoke all on table public.personal_ai_estimate_revisions from public,anon;
grant select,insert,update,delete on public.personal_ai_usage_records to authenticated;
grant select,insert,update,delete on public.personal_ai_monthly_token_budgets to authenticated;
grant select on public.personal_ai_estimate_revisions to authenticated;

comment on table public.personal_ai_usage_records is 'Private, user-owned personal AI usage. Not CleanMyMap project environmental snapshots.';
comment on table public.personal_ai_estimate_revisions is 'Append-only private scientific calculation revisions, no published environmental credit.';
