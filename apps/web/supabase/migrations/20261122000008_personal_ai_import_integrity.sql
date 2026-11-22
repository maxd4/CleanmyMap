begin;

-- PURPOSE: restore unknown-period imports and keep source identity immutable outside versioned confirmation.
-- CALLER: authenticated declaration/import routes through owner-scoped RLS or dedicated RPCs.
-- AUTHORIZATION_BOUNDARY: Clerk ownership remains in RLS; import content changes require the definer import RPC.
-- IDEMPOTENCY: confirm_personal_ai_import retains owner plus stable source identity and revision semantics.
-- ATOMICITY: migration and each import confirmation remain transactional; conflict rejection rolls back.
-- FAILURE_BEHAVIOR: ambiguous overlaps and direct import edits raise SQLSTATE 23P01/42501.
-- SEARCH_PATH: all new functions use pg_catalog, public; privileged functions remain fixed-path.
-- GRANTS: overlap predicate is read-only; mutation trigger is internal; confirmation remains authenticated-only.

alter table public.personal_ai_declarations
  drop constraint personal_ai_declaration_shape;

alter table public.personal_ai_declarations
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
    and (
      declaration ->> 'modelRaw' is null
      or (
        length(declaration ->> 'modelRaw') <= 80
        and declaration ->> 'modelRaw' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
        and declaration ->> 'modelRaw' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
        and declaration ->> 'modelRaw' !~ '^[0-9]{8,}$'
        and declaration ->> 'modelRaw' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
      )
    )
    and length(coalesce(declaration ->> 'modelCanonical', '')) <= 80
    and (
      declaration ->> 'operator' is null
      or (
        length(declaration ->> 'operator') <= 80
        and declaration ->> 'operator' ~ '^[A-Za-z0-9][A-Za-z0-9._+/-]*( [A-Za-z0-9][A-Za-z0-9._+/-]*){0,4}$'
        and declaration ->> 'operator' !~* '^(sk|key|acct|account|org|proj)[-_]?[a-z0-9_-]{8,}$'
        and declaration ->> 'operator' !~ '^[0-9]{8,}$'
        and declaration ->> 'operator' !~* '^[a-f0-9]{8}-[a-f0-9-]{27,}$'
      )
    )
    and length(coalesce(declaration ->> 'sourceVersion', '')) <= 80
    and (declaration ->> 'inferenceRegion' is null or declaration ->> 'inferenceRegion' = 'UNKNOWN' or length(declaration ->> 'inferenceRegion') = 2)
    and (
      (declaration -> 'periodStartUtc' = 'null'::jsonb and declaration -> 'periodEndUtc' = 'null'::jsonb
        and period_start_utc is null and period_end_utc is null)
      or (
        declaration ->> 'periodStartUtc' is not null and declaration ->> 'periodEndUtc' is not null
        and (declaration ->> 'periodStartUtc')::timestamptz = period_start_utc
        and (declaration ->> 'periodEndUtc')::timestamptz = period_end_utc
      )
    )
  );

create or replace function public.personal_ai_declarations_may_overlap(
  p_left_provider text,
  p_left_period_start timestamptz,
  p_left_period_end timestamptz,
  p_left_declaration jsonb,
  p_left_scope jsonb,
  p_right_provider text,
  p_right_period_start timestamptz,
  p_right_period_end timestamptz,
  p_right_declaration jsonb,
  p_right_scope jsonb
)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select p_left_provider = p_right_provider
    and (
      p_left_period_start is null or p_left_period_end is null
      or p_right_period_start is null or p_right_period_end is null
      or tstzrange(p_left_period_start, p_left_period_end, '[)')
           && tstzrange(p_right_period_start, p_right_period_end, '[)')
    )
    and (
      (p_left_declaration ->> 'modelCanonical' is null and p_left_declaration ->> 'modelRaw' is null)
      or (p_right_declaration ->> 'modelCanonical' is null and p_right_declaration ->> 'modelRaw' is null)
      or p_left_declaration ->> 'modelCanonical' = p_right_declaration ->> 'modelCanonical'
      or p_left_declaration ->> 'modelCanonical' = p_right_declaration ->> 'modelRaw'
      or p_left_declaration ->> 'modelRaw' = p_right_declaration ->> 'modelCanonical'
      or p_left_declaration ->> 'modelRaw' = p_right_declaration ->> 'modelRaw'
    )
    and (
      p_left_scope is null or p_right_scope is null
      or jsonb_typeof(p_left_scope) <> 'object' or jsonb_typeof(p_right_scope) <> 'object'
      or not exists (
        select 1
          from jsonb_each_text(p_left_scope) left_scope
          join jsonb_each_text(p_right_scope) right_scope using (key)
         where left_scope.value <> right_scope.value
      )
    );
$$;

revoke all on function public.personal_ai_declarations_may_overlap(text, timestamptz, timestamptz, jsonb, jsonb, text, timestamptz, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.personal_ai_declarations_may_overlap(text, timestamptz, timestamptz, jsonb, jsonb, text, timestamptz, timestamptz, jsonb, jsonb) to authenticated, service_role;

create or replace function public.guard_personal_ai_chat_scenario_overlap()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status <> 'ACTIVE' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.owner_clerk_id, 0));

  if exists (
    select 1
      from public.personal_ai_declarations existing
     where existing.owner_clerk_id = new.owner_clerk_id
       and existing.id is distinct from new.id
       and existing.status = 'ACTIVE'
       and existing.source_identity_hash is distinct from new.source_identity_hash
       and (
         existing.source_identity_hash is not null or new.source_identity_hash is not null
         or existing.quick_scenario is not null or new.quick_scenario is not null
       )
       and public.personal_ai_declarations_may_overlap(
         coalesce(existing.import_metadata ->> 'provider', existing.declaration ->> 'provider'),
         existing.period_start_utc, existing.period_end_utc, existing.declaration, existing.source_scope,
         coalesce(new.import_metadata ->> 'provider', new.declaration ->> 'provider'),
         new.period_start_utc, new.period_end_utc, new.declaration, new.source_scope
       )
  ) then
    raise exception 'active personal AI activity period and scope may overlap another source; exclude or reconcile one source'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

create or replace function public.guard_personal_ai_import_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_table_owner text;
begin
  if old.source_identity_hash is null and new.source_identity_hash is null then return new; end if;
  if old.period_start_utc is not distinct from new.period_start_utc
     and old.period_end_utc is not distinct from new.period_end_utc
     and old.declaration is not distinct from new.declaration
     and old.snapshot is not distinct from new.snapshot
     and old.methodology_version is not distinct from new.methodology_version
     and old.factor_version is not distinct from new.factor_version
     and old.source_identity_hash is not distinct from new.source_identity_hash
     and old.source_scope is not distinct from new.source_scope
     and old.normalized_content_hash is not distinct from new.normalized_content_hash
     and old.import_metadata is not distinct from new.import_metadata
     and old.cost_amount is not distinct from new.cost_amount
     and old.cost_currency is not distinct from new.cost_currency
     and old.import_revision is not distinct from new.import_revision
     and old.quick_scenario is not distinct from new.quick_scenario then
    return new;
  end if;

  select pg_get_userbyid(relowner) into v_table_owner
    from pg_class where oid = 'public.personal_ai_declarations'::regclass;
  if current_user::text <> v_table_owner
     or current_setting('cmm.personal_ai_import_mutation', true) is distinct from 'confirm_personal_ai_import' then
    raise exception 'import content can only be changed by confirm_personal_ai_import'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_personal_ai_import_mutation() from public, anon, authenticated;
drop trigger if exists personal_ai_import_mutation_guard on public.personal_ai_declarations;
create trigger personal_ai_import_mutation_guard
  before update on public.personal_ai_declarations
  for each row execute function public.guard_personal_ai_import_mutation();

create or replace function public.confirm_personal_ai_import(p_rows jsonb)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner text := auth.jwt() ->> 'sub';
  v_item jsonb;
  v_scope jsonb;
  v_scope_count integer;
  v_scope_key text;
  v_scope_hash text;
  v_saved public.personal_ai_declarations;
begin
  if v_owner is null or length(v_owner) not between 1 and 255 then
    raise exception 'authenticated owner required' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 20000
     or octet_length(p_rows::text) > 16000000 then
    raise exception 'invalid import batch size' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_owner, 0));
  perform set_config('cmm.personal_ai_import_mutation', 'confirm_personal_ai_import', true);

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or v_item - array[
         'declaration', 'snapshot', 'methodology_version', 'factor_version',
         'source_identity_hash', 'source_scope', 'normalized_content_hash', 'import_metadata',
         'cost_amount', 'cost_currency'
       ]::text[] <> '{}'::jsonb
       or not (v_item ?& array[
         'declaration', 'snapshot', 'methodology_version', 'factor_version',
         'source_identity_hash', 'source_scope', 'normalized_content_hash', 'import_metadata'
       ]::text[])
       or (v_item ->> 'source_identity_hash') !~ '^[a-f0-9]{64}$'
       or (v_item ->> 'normalized_content_hash') !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid import row shape' using errcode = '22023';
    end if;

    v_scope := v_item -> 'source_scope';
    if jsonb_typeof(v_scope) <> 'object' then
      raise exception 'invalid import identity scope' using errcode = '22023';
    end if;
    select count(*) into v_scope_count from jsonb_object_keys(v_scope);
    if v_scope_count not between 1 and 16 then
      raise exception 'invalid import identity scope' using errcode = '22023';
    end if;
    for v_scope_key, v_scope_hash in select key, value from jsonb_each_text(v_scope)
    loop
      if v_scope_key !~ '^[a-z][a-z0-9_]{0,79}$' or v_scope_hash !~ '^[a-f0-9]{64}$' then
        raise exception 'invalid import identity scope' using errcode = '22023';
      end if;
    end loop;

    if exists (
      select 1
        from public.personal_ai_declarations existing
       where existing.owner_clerk_id = v_owner
         and existing.status = 'ACTIVE'
         and existing.source_identity_hash is distinct from (v_item ->> 'source_identity_hash')
         and public.personal_ai_declarations_may_overlap(
           coalesce(existing.import_metadata ->> 'provider', existing.declaration ->> 'provider'),
           existing.period_start_utc, existing.period_end_utc, existing.declaration, existing.source_scope,
           coalesce(v_item #>> '{import_metadata,provider}', v_item #>> '{declaration,provider}'),
           nullif(v_item #>> '{declaration,periodStartUtc}', '')::timestamptz,
           nullif(v_item #>> '{declaration,periodEndUtc}', '')::timestamptz,
           v_item -> 'declaration', v_scope
         )
    ) then
      raise exception 'overlapping personal AI import scope' using errcode = '23P01';
    end if;

    insert into public.personal_ai_declarations (
      owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
      methodology_version, factor_version, source_identity_hash, source_scope,
      normalized_content_hash, import_metadata, cost_amount, cost_currency
    ) values (
      v_owner,
      nullif(v_item #>> '{declaration,periodStartUtc}', '')::timestamptz,
      nullif(v_item #>> '{declaration,periodEndUtc}', '')::timestamptz,
      v_item -> 'declaration', v_item -> 'snapshot',
      v_item ->> 'methodology_version', v_item ->> 'factor_version',
      v_item ->> 'source_identity_hash', v_scope, v_item ->> 'normalized_content_hash',
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
      source_scope = excluded.source_scope,
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
  'PURPOSE: atomically confirm normalized imports. CALLER: authenticated server route with Clerk JWT. AUTHORIZATION_BOUNDARY: owner derived from auth.jwt sub. IDEMPOTENCY: owner plus stable source hash; exact content retries do not increment revision. OVERLAP: one shared database predicate rejects compatible model, period and source scopes; only attested disjoint dimensions may coexist. ATOMICITY: one PostgreSQL function transaction for the complete batch. FAILURE_BEHAVIOR: any invalid row or overlap rolls back the batch. SEARCH_PATH: pg_catalog, public. GRANTS: authenticated execute only.';

commit;
