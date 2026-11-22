begin;

alter table public.personal_ai_declarations
  add column source_scope jsonb,
  add constraint personal_ai_source_scope_shape check (
    source_scope is null or jsonb_typeof(source_scope) = 'object'
  );

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
           and (
             existing.period_start_utc is null
             or nullif(v_item #>> '{declaration,periodStartUtc}', '') is null
             or (
               existing.period_start_utc < (v_item #>> '{declaration,periodEndUtc}')::timestamptz
               and (v_item #>> '{declaration,periodStartUtc}')::timestamptz < existing.period_end_utc
             )
           )
           and existing.import_metadata ->> 'provider' = v_item #>> '{import_metadata,provider}'
           and (
             coalesce(existing.declaration ->> 'modelCanonical', existing.declaration ->> 'modelRaw')
               is not distinct from coalesce(v_item #>> '{declaration,modelCanonical}', v_item #>> '{declaration,modelRaw}')
             or existing.declaration ->> 'modelCanonical' = v_item #>> '{declaration,modelRaw}'
             or existing.declaration ->> 'modelRaw' = v_item #>> '{declaration,modelCanonical}'
           )
           and not (
             existing.source_scope is not null
             and exists (
               select 1
               from jsonb_each_text(existing.source_scope) prior_scope
               join jsonb_each_text(v_scope) incoming_scope using (key)
               where prior_scope.value <> incoming_scope.value
             )
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
  'PURPOSE: atomically confirm normalized imports. CALLER: authenticated server route with Clerk JWT. AUTHORIZATION_BOUNDARY: owner derived from auth.jwt sub. IDEMPOTENCY: owner plus stable source hash; exact content retries do not increment revision. OVERLAP: only proven disjoint hashed source dimensions may overlap; missing or nested scopes conflict. ATOMICITY: one PostgreSQL function transaction for the complete batch. FAILURE_BEHAVIOR: any invalid row rolls back the batch. SEARCH_PATH: pg_catalog, public. GRANTS: authenticated execute only.';

commit;
