begin;

alter table public.personal_ai_declarations
  alter column period_start_utc drop not null,
  alter column period_end_utc drop not null,
  add column source_identity_hash text,
  add column normalized_content_hash text,
  add column import_metadata jsonb,
  add column cost_amount numeric,
  add column cost_currency text,
  add column import_revision integer not null default 1;

alter table public.personal_ai_declarations
  drop constraint personal_ai_period_order,
  drop constraint personal_ai_declaration_shape;

alter table public.personal_ai_declarations
  add constraint personal_ai_period_order check (
    (period_start_utc is null and period_end_utc is null)
    or (period_start_utc is not null and period_end_utc is not null and period_start_utc < period_end_utc)
  ),
  add constraint personal_ai_declaration_shape check (
    jsonb_typeof(declaration) = 'object'
    and declaration - array[
      'normalizationVersion', 'provider', 'source', 'sourceVersion', 'provenance',
      'granularity', 'periodStartUtc', 'periodEndUtc', 'modelRaw', 'modelCanonical',
      'operator', 'execution', 'inferenceRegion', 'access', 'requestCount', 'tokens',
      'modality', 'energy'
    ]::text[] = '{}'::jsonb
    and declaration ?& array[
      'normalizationVersion', 'provider', 'source', 'sourceVersion', 'provenance',
      'granularity', 'periodStartUtc', 'periodEndUtc', 'modelRaw', 'modelCanonical',
      'operator', 'execution', 'inferenceRegion', 'access', 'requestCount', 'tokens',
      'modality', 'energy'
    ]::text[]
    and jsonb_typeof(declaration -> 'tokens') = 'object'
    and declaration -> 'tokens' - array[
      'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
      'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
    ]::text[] = '{}'::jsonb
    and (declaration -> 'tokens') ?& array[
      'inputTotal', 'inputUncached', 'cacheRead', 'cacheWrite', 'outputVisible',
      'outputReasoning', 'outputTotal', 'reasoningRelation', 'logicalTotal'
    ]::text[]
    and jsonb_typeof(declaration -> 'modality') = 'object'
    and declaration -> 'modality' - array['images', 'audioMinutes', 'videoSeconds']::text[] = '{}'::jsonb
    and (declaration -> 'modality') ?& array['images', 'audioMinutes', 'videoSeconds']::text[]
    and jsonb_typeof(declaration -> 'energy') = 'object'
    and declaration -> 'energy' - array[
      'kwh', 'boundary', 'evidence', 'averageWatts', 'durationSeconds', 'idleWatts'
    ]::text[] = '{}'::jsonb
    and (declaration -> 'energy') ?& array[
      'kwh', 'boundary', 'evidence', 'averageWatts', 'durationSeconds', 'idleWatts'
    ]::text[]
    and declaration ->> 'normalizationVersion' = 'personal-ai-declaration-v1'
    and declaration ->> 'provider' in ('MANUAL', 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'MISTRAL', 'OTHER')
    and declaration ->> 'source' in ('MANUAL', 'PROVIDER_EXPORT', 'PROVIDER_DASHBOARD', 'LOCAL_LOG')
    and declaration ->> 'provenance' in ('USER_DECLARED', 'PROVIDER_REPORTED', 'DEVICE_MEASURED')
    and declaration ->> 'granularity' in ('PER_REQUEST', 'AGGREGATE', 'UNKNOWN')
    and declaration ->> 'execution' in ('CLOUD', 'LOCAL')
    and declaration ->> 'access' in ('API', 'SUBSCRIPTION', 'LOCAL_OWNED', 'UNKNOWN')
    and (declaration ->> 'modelRaw' is null or (
      length(declaration ->> 'modelRaw') <= 80
      and declaration ->> 'modelRaw' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
      and declaration ->> 'modelRaw' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
      and declaration ->> 'modelRaw' !~ '^[0-9]{8,}$'
      and declaration ->> 'modelRaw' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
    ))
    and length(coalesce(declaration ->> 'modelCanonical', '')) <= 80
    and (declaration ->> 'operator' is null or (
      length(declaration ->> 'operator') <= 80
      and declaration ->> 'operator' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
      and declaration ->> 'operator' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
      and declaration ->> 'operator' !~ '^[0-9]{8,}$'
      and declaration ->> 'operator' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
    ))
    and length(coalesce(declaration ->> 'sourceVersion', '')) <= 80
    and (declaration ->> 'inferenceRegion' is null or declaration ->> 'inferenceRegion' = 'UNKNOWN' or length(declaration ->> 'inferenceRegion') = 2)
    and (
      (declaration -> 'periodStartUtc' = 'null'::jsonb and declaration -> 'periodEndUtc' = 'null'::jsonb and period_start_utc is null and period_end_utc is null)
      or (
        declaration ->> 'periodStartUtc' is not null and declaration ->> 'periodEndUtc' is not null
        and (declaration ->> 'periodStartUtc')::timestamptz = period_start_utc
        and (declaration ->> 'periodEndUtc')::timestamptz = period_end_utc
      )
    )
  ),
  add constraint personal_ai_import_hashes check (
    (source_identity_hash is null and normalized_content_hash is null and import_metadata is null)
    or (
      source_identity_hash is not null and normalized_content_hash is not null and import_metadata is not null
      and
      source_identity_hash ~ '^[a-f0-9]{64}$'
      and normalized_content_hash ~ '^[a-f0-9]{64}$'
      and jsonb_typeof(import_metadata) = 'object'
      and import_metadata - array['provider', 'granularity', 'completeness', 'freshnessUtc']::text[] = '{}'::jsonb
      and (import_metadata ?& array['provider', 'granularity', 'completeness']::text[])
      and import_metadata ->> 'provider' in ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'OTHER')
      and import_metadata ->> 'granularity' in ('PER_REQUEST', 'AGGREGATE', 'UNKNOWN')
      and import_metadata ->> 'completeness' in ('COMPLETE', 'PARTIAL', 'UNKNOWN')
      and (not (import_metadata ? 'freshnessUtc') or import_metadata -> 'freshnessUtc' = 'null'::jsonb or (import_metadata ->> 'freshnessUtc')::timestamptz is not null)
    )
  ),
  add constraint personal_ai_import_cost check (
    (cost_amount is null and cost_currency is null)
    or (cost_amount is not null and cost_amount >= 0 and cost_currency is not null and cost_currency ~ '^[A-Z]{3}$')
  ),
  add constraint personal_ai_import_revision_positive check (import_revision > 0);

create unique index personal_ai_declarations_owner_import_identity_idx
  on public.personal_ai_declarations (owner_clerk_id, source_identity_hash)
  where source_identity_hash is not null;

create or replace function public.confirm_personal_ai_import(p_rows jsonb)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner text := auth.jwt() ->> 'sub';
  v_item jsonb;
  v_saved public.personal_ai_declarations;
begin
  if v_owner is null or length(v_owner) not between 1 and 255 then
    raise exception 'authenticated owner required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 20000
     or octet_length(p_rows::text) > 16000000 then
    raise exception 'invalid import batch size' using errcode = '22023';
  end if;

  -- Serialize each owner's batches so distinct overlapping identities cannot
  -- pass the overlap check concurrently and both become active.
  perform pg_advisory_xact_lock(hashtextextended(v_owner, 0));

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or v_item - array[
         'declaration', 'snapshot', 'methodology_version', 'factor_version',
         'source_identity_hash', 'normalized_content_hash', 'import_metadata',
         'cost_amount', 'cost_currency'
       ]::text[] <> '{}'::jsonb
       or not (v_item ?& array[
         'declaration', 'snapshot', 'methodology_version', 'factor_version',
         'source_identity_hash', 'normalized_content_hash', 'import_metadata'
       ]::text[])
       or (v_item ->> 'source_identity_hash') !~ '^[a-f0-9]{64}$'
       or (v_item ->> 'normalized_content_hash') !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid import row shape' using errcode = '22023';
    end if;

    if nullif(v_item #>> '{declaration,periodStartUtc}', '') is not null
       and exists (
         select 1
         from public.personal_ai_declarations existing
         where existing.owner_clerk_id = v_owner
           and existing.status = 'ACTIVE'
           and existing.source_identity_hash is distinct from (v_item ->> 'source_identity_hash')
           and existing.period_start_utc < (v_item #>> '{declaration,periodEndUtc}')::timestamptz
           and (v_item #>> '{declaration,periodStartUtc}')::timestamptz < existing.period_end_utc
           and existing.import_metadata ->> 'provider' = v_item #>> '{import_metadata,provider}'
           and (
             coalesce(existing.declaration ->> 'modelCanonical', existing.declaration ->> 'modelRaw')
               is not distinct from coalesce(v_item #>> '{declaration,modelCanonical}', v_item #>> '{declaration,modelRaw}')
             or existing.declaration ->> 'modelCanonical' = v_item #>> '{declaration,modelRaw}'
             or existing.declaration ->> 'modelRaw' = v_item #>> '{declaration,modelCanonical}'
           )
       ) then
      raise exception 'overlapping personal AI import scope' using errcode = '23P01';
    end if;

    insert into public.personal_ai_declarations (
      owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
      methodology_version, factor_version, source_identity_hash,
      normalized_content_hash, import_metadata, cost_amount, cost_currency
    ) values (
      v_owner,
      nullif(v_item #>> '{declaration,periodStartUtc}', '')::timestamptz,
      nullif(v_item #>> '{declaration,periodEndUtc}', '')::timestamptz,
      v_item -> 'declaration', v_item -> 'snapshot',
      v_item ->> 'methodology_version', v_item ->> 'factor_version',
      v_item ->> 'source_identity_hash', v_item ->> 'normalized_content_hash',
      v_item -> 'import_metadata', nullif(v_item ->> 'cost_amount', '')::numeric,
      v_item ->> 'cost_currency'
    )
    on conflict (owner_clerk_id, source_identity_hash) where source_identity_hash is not null
    do update set
      period_start_utc = excluded.period_start_utc,
      period_end_utc = excluded.period_end_utc,
      declaration = excluded.declaration,
      snapshot = excluded.snapshot,
      methodology_version = excluded.methodology_version,
      factor_version = excluded.factor_version,
      normalized_content_hash = excluded.normalized_content_hash,
      import_metadata = excluded.import_metadata,
      cost_amount = excluded.cost_amount,
      cost_currency = excluded.cost_currency,
      import_revision = case
        when public.personal_ai_declarations.normalized_content_hash is distinct from excluded.normalized_content_hash
        then public.personal_ai_declarations.import_revision + 1
        else public.personal_ai_declarations.import_revision
      end
    returning * into v_saved;
    return next v_saved;
  end loop;
  return;
end;
$$;

revoke all on function public.confirm_personal_ai_import(jsonb) from public, anon;
grant execute on function public.confirm_personal_ai_import(jsonb) to authenticated;

comment on function public.confirm_personal_ai_import(jsonb) is
  'PURPOSE: atomically confirm normalized imports. CALLER: authenticated server route with Clerk JWT. AUTHORIZATION_BOUNDARY: owner derived from auth.jwt sub. IDEMPOTENCY: owner plus stable source hash; exact content retries do not increment revision. ATOMICITY: one PostgreSQL function transaction for the complete batch. FAILURE_BEHAVIOR: any invalid row rolls back the batch. SEARCH_PATH: pg_catalog, public. GRANTS: authenticated execute only; no client direct import metadata grants.';

commit;
