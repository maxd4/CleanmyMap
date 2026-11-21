begin;

create table if not exists public.personal_ai_declarations (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null default (auth.jwt() ->> 'sub'),
  period_start_utc timestamptz not null,
  period_end_utc timestamptz not null,
  declaration jsonb not null,
  snapshot jsonb not null,
  methodology_version text not null,
  factor_version text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXCLUDED')),
  created_at timestamptz not null default now(),
  constraint personal_ai_owner_nonempty check (length(owner_clerk_id) between 1 and 255),
  constraint personal_ai_period_order check (period_start_utc < period_end_utc),
  constraint personal_ai_declaration_size check (octet_length(declaration::text) <= 12000),
  constraint personal_ai_snapshot_size check (octet_length(snapshot::text) <= 24000),
  constraint personal_ai_declaration_shape check (
    jsonb_typeof(declaration) = 'object'
    and declaration - array[
      'normalizationVersion', 'provider', 'source', 'sourceVersion', 'provenance',
      'granularity', 'periodStartUtc', 'periodEndUtc', 'modelRaw', 'modelCanonical',
      'operator', 'execution', 'inferenceRegion', 'access', 'requestCount', 'tokens',
      'modality', 'energy'
    ]::text[] = '{}'::jsonb
    and jsonb_object_length(declaration) = 18
    and jsonb_typeof(declaration -> 'tokens') = 'object'
    and declaration -> 'tokens' - array[
      'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
      'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
    ]::text[] = '{}'::jsonb
    and jsonb_object_length(declaration -> 'tokens') = 9
    and jsonb_typeof(declaration -> 'modality') = 'object'
    and declaration -> 'modality' - array['images', 'audioMinutes', 'videoSeconds']::text[] = '{}'::jsonb
    and jsonb_object_length(declaration -> 'modality') = 3
    and jsonb_typeof(declaration -> 'energy') = 'object'
    and declaration -> 'energy' - array[
      'kwh', 'boundary', 'evidence', 'averageWatts', 'durationSeconds', 'idleWatts'
    ]::text[] = '{}'::jsonb
    and jsonb_object_length(declaration -> 'energy') = 6
    and declaration ->> 'normalizationVersion' = 'personal-ai-declaration-v1'
    and declaration ->> 'provider' in ('MANUAL', 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'MISTRAL', 'OTHER')
    and declaration ->> 'source' in ('MANUAL', 'PROVIDER_EXPORT', 'PROVIDER_DASHBOARD', 'LOCAL_LOG')
    and declaration ->> 'provenance' in ('USER_DECLARED', 'PROVIDER_REPORTED', 'DEVICE_MEASURED')
    and declaration ->> 'granularity' in ('PER_REQUEST', 'AGGREGATE', 'UNKNOWN')
    and declaration ->> 'execution' in ('CLOUD', 'LOCAL')
    and declaration ->> 'access' in ('API', 'SUBSCRIPTION', 'LOCAL_OWNED')
    and length(coalesce(declaration ->> 'modelRaw', '')) <= 80
    and coalesce(declaration ->> 'modelRaw', '') ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
    and coalesce(declaration ->> 'modelRaw', '') !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
    and coalesce(declaration ->> 'modelRaw', '') !~ '^[0-9]{8,}$'
    and coalesce(declaration ->> 'modelRaw', '') !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
    and length(coalesce(declaration ->> 'modelCanonical', '')) <= 80
    and length(coalesce(declaration ->> 'operator', '')) <= 80
    and coalesce(declaration ->> 'operator', '') ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
    and coalesce(declaration ->> 'operator', '') !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
    and coalesce(declaration ->> 'operator', '') !~ '^[0-9]{8,}$'
    and coalesce(declaration ->> 'operator', '') !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
    and length(coalesce(declaration ->> 'sourceVersion', '')) <= 80
    and (declaration ->> 'inferenceRegion' is null or declaration ->> 'inferenceRegion' = 'UNKNOWN' or length(declaration ->> 'inferenceRegion') = 2)
    and declaration ->> 'periodStartUtc' is not null
    and declaration ->> 'periodEndUtc' is not null
    and (declaration ->> 'periodStartUtc')::timestamptz = period_start_utc
    and (declaration ->> 'periodEndUtc')::timestamptz = period_end_utc
  ),
  constraint personal_ai_snapshot_shape check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'physicalTotals'
    and snapshot ? 'methodologyTrace'
  )
);

create index if not exists personal_ai_declarations_owner_period_idx
  on public.personal_ai_declarations (owner_clerk_id, created_at desc, id);

alter table public.personal_ai_declarations enable row level security;

drop policy if exists personal_ai_declarations_owner_select on public.personal_ai_declarations;
create policy personal_ai_declarations_owner_select
  on public.personal_ai_declarations for select to authenticated
  using (owner_clerk_id = (select auth.jwt() ->> 'sub'));

drop policy if exists personal_ai_declarations_owner_insert on public.personal_ai_declarations;
create policy personal_ai_declarations_owner_insert
  on public.personal_ai_declarations for insert to authenticated
  with check (owner_clerk_id = (select auth.jwt() ->> 'sub'));

drop policy if exists personal_ai_declarations_owner_update on public.personal_ai_declarations;
create policy personal_ai_declarations_owner_update
  on public.personal_ai_declarations for update to authenticated
  using (owner_clerk_id = (select auth.jwt() ->> 'sub'))
  with check (owner_clerk_id = (select auth.jwt() ->> 'sub'));

drop policy if exists personal_ai_declarations_owner_delete on public.personal_ai_declarations;
create policy personal_ai_declarations_owner_delete
  on public.personal_ai_declarations for delete to authenticated
  using (owner_clerk_id = (select auth.jwt() ->> 'sub'));

revoke all on public.personal_ai_declarations from anon, authenticated;
grant select, delete on public.personal_ai_declarations to authenticated;
grant insert (
  owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
  methodology_version, factor_version, status
) on public.personal_ai_declarations to authenticated;
grant update (
  period_start_utc, period_end_utc, declaration, snapshot,
  methodology_version, factor_version, status
) on public.personal_ai_declarations to authenticated;
grant all on public.personal_ai_declarations to service_role;

comment on table public.personal_ai_declarations is
  'Private user declarations and versioned scientific snapshots; excludes prompts, conversations, invoices, account identifiers and Lot 3 budgets/history.';

commit;
