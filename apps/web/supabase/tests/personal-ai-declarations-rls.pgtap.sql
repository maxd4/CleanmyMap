begin;

select plan(95);

select has_table('public', 'personal_ai_declarations', 'private declarations table exists');
select has_column('public', 'personal_ai_declarations', 'quick_scenario', 'optional chatbot scenario is stored on the existing private table');
select ok(not has_function_privilege('authenticated', 'public.save_personal_ai_chat_scenario(uuid,jsonb,jsonb,jsonb,text,text)', 'EXECUTE'), 'authenticated cannot call the internal scenario RPC');
select ok(not has_function_privilege('authenticated', 'public.confirm_personal_ai_import(jsonb)', 'EXECUTE'), 'authenticated cannot call the internal import RPC');
select ok(has_function_privilege('service_role', 'public.save_personal_ai_declaration_for_owner(text,uuid,jsonb,jsonb,jsonb,text,text,text)', 'EXECUTE'), 'service_role can call the owner-explicit server declaration RPC');
select ok(has_function_privilege('service_role', 'public.confirm_personal_ai_import_for_owner(text,jsonb)', 'EXECUTE'), 'service_role can call the owner-explicit server import RPC');
select ok(has_function_privilege('service_role', 'public.set_personal_ai_declaration_status_for_owner(text,uuid,text)', 'EXECUTE'), 'service_role can call the owner-explicit status RPC');
select ok((select relrowsecurity from pg_class where oid = 'public.personal_ai_declarations'::regclass), 'row level security is enabled');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'SELECT'), 'anon cannot read declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'INSERT'), 'anon cannot insert declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'UPDATE'), 'anon cannot update declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'DELETE'), 'anon cannot delete declarations');
select ok(has_table_privilege('authenticated', 'public.personal_ai_declarations', 'SELECT'), 'authenticated role can select through RLS');
select ok(not has_table_privilege('authenticated', 'public.personal_ai_declarations', 'INSERT'), 'authenticated cannot insert declaration rows directly');
select ok(not has_table_privilege('authenticated', 'public.personal_ai_declarations', 'UPDATE'), 'authenticated cannot update declaration rows directly');
select ok(not has_table_privilege('service_role', 'public.personal_ai_declarations', 'INSERT'), 'service_role cannot bypass the server RPC with direct inserts');
select ok(not has_table_privilege('service_role', 'public.personal_ai_declarations', 'UPDATE'), 'service_role cannot bypass the server RPC with direct updates');
select ok(not has_table_privilege('service_role', 'public.personal_ai_declarations', 'DELETE'), 'service_role cannot bypass the owner-scoped deletion path');
select ok(has_table_privilege('authenticated', 'public.personal_ai_declarations', 'DELETE'), 'authenticated role can delete through RLS');

create function pg_temp.personal_ai_confirm_test(p_rows jsonb)
returns setof public.personal_ai_declarations
language sql security definer set search_path = pg_catalog, public
as $$ select * from public.confirm_personal_ai_import_for_owner(coalesce(nullif(auth.jwt() ->> 'sub', ''), 'user-a'), p_rows) $$;
create function pg_temp.personal_ai_save_test(
  p_id uuid, p_declaration jsonb, p_quick_scenario jsonb, p_snapshot jsonb,
  p_methodology_version text, p_factor_version text, p_status text default null
)
returns setof public.personal_ai_declarations
language sql security definer set search_path = pg_catalog, public
as $$ select * from public.save_personal_ai_declaration_for_owner(
  coalesce(nullif(auth.jwt() ->> 'sub', ''), 'user-a'), p_id, p_declaration,
  p_quick_scenario, p_snapshot, p_methodology_version, p_factor_version, p_status
) $$;
create function pg_temp.personal_ai_status_test(p_id uuid, p_status text)
returns setof public.personal_ai_declarations
language sql security definer set search_path = pg_catalog, public
as $$ select * from public.set_personal_ai_declaration_status_for_owner(
  coalesce(nullif(auth.jwt() ->> 'sub', ''), 'user-a'), p_id, p_status
) $$;
with fixture as (
  select
    jsonb_build_object(
      'normalizationVersion', 'personal-ai-declaration-v1', 'provider', 'MANUAL', 'source', 'MANUAL',
      'sourceVersion', null, 'provenance', 'USER_DECLARED', 'granularity', 'UNKNOWN',
      'periodStartUtc', '2026-01-01T00:00:00.000Z', 'periodEndUtc', '2026-02-01T00:00:00.000Z',
      'modelRaw', null, 'modelCanonical', null, 'operator', null, 'execution', 'CLOUD',
      'inferenceRegion', null, 'access', 'API', 'requestCount', null,
      'tokens', jsonb_build_object('inputTotal', null, 'inputUncached', null, 'cacheRead', null, 'cacheWrite', null,
        'outputVisible', null, 'outputReasoning', null, 'outputTotal', null, 'reasoningRelation', 'UNKNOWN', 'logicalTotal', null),
      'modality', jsonb_build_object('images', null, 'audioMinutes', null, 'videoSeconds', null),
      'energy', jsonb_build_object('kwh', null, 'boundary', null, 'evidence', null, 'averageWatts', null, 'durationSeconds', null, 'idleWatts', null)
    ) as declaration,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb as snapshot
)
insert into public.personal_ai_declarations (
  id, owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
  methodology_version, factor_version
)
select fixture_row.id, fixture_row.owner_id, '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z',
  case when fixture_row.owner_id = 'user-b' then fixture.declaration || jsonb_build_object('modelRaw', 'gpt-4.1', 'operator', 'aws_bedrock') else fixture.declaration end,
  fixture.snapshot, 'personal-ai-v1', 'factors-v1'
from fixture
cross join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'user-a'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'user-b')
) as fixture_row(id, owner_id);

select ok((
  select declaration ?& array['modelRaw', 'operator']::text[]
    and declaration -> 'modelRaw' = 'null'::jsonb
    and declaration -> 'operator' = 'null'::jsonb
  from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'
), 'optional model and operator labels accept explicit null');
select is((
  select count(*)::integer from public.personal_ai_declarations
  where id = '10000000-0000-4000-8000-000000000002'
    and declaration ->> 'modelRaw' = 'gpt-4.1'
    and declaration ->> 'operator' = 'aws_bedrock'
), 1, 'non-null model and operator labels accept valid values');
select throws_ok($$update public.personal_ai_declarations set declaration = declaration - 'provider' where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'missing required top-level key is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = declaration || '{"providerAccountId":"account-fixture-value-12345"}'::jsonb where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'extra sensitive top-level key is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{tokens}', (declaration -> 'tokens') - 'inputTotal') where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'missing required nested key is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{tokens}', (declaration -> 'tokens') || '{"providerKey":"synthetic-fixture"}'::jsonb) where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'extra nested key is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{modelRaw}', '"account-identifier-fixture"'::jsonb) where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'sensitive model label is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{operator}', '"1234567890123456"'::jsonb) where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'numeric account-like operator is rejected');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{operator}', to_jsonb('person' || chr(64) || 'example.test')) where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'personal email-like operator is rejected');
select throws_ok($$update public.personal_ai_declarations set status = 'INVALID' where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'invalid status is rejected');
select throws_ok($$update public.personal_ai_declarations set period_start_utc = period_end_utc where id = '10000000-0000-4000-8000-000000000001'$$, '23514', null, 'empty period is rejected');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select count(*) from public.personal_ai_declarations$$, '42501', null, 'anon query is denied');
select throws_ok($$insert into public.personal_ai_declarations (period_start_utc, period_end_utc, declaration, snapshot, methodology_version, factor_version) values (now(), now() + interval '1 day', '{}'::jsonb, '{}'::jsonb, 'x', 'x')$$, '42501', null, 'anon insert is denied');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user-a"}', true);
select is((select count(*)::integer from public.personal_ai_declarations), 1, 'A sees only A declaration');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-b'), 0, 'A cannot query B declaration');
select throws_ok($$select * from public.save_personal_ai_declaration_for_owner('user-a', null, '{}'::jsonb, null, '{}'::jsonb, 'x', 'x', null)$$, '42501', null, 'authenticated cannot call the owner-explicit declaration RPC directly');
select throws_ok($$select * from public.set_personal_ai_declaration_status_for_owner('user-a', '10000000-0000-4000-8000-000000000001', 'EXCLUDED')$$, '42501', null, 'authenticated cannot call the owner-explicit status RPC directly');
select throws_ok($$select * from public.confirm_personal_ai_import_for_owner('user-a', '[]'::jsonb)$$, '42501', null, 'authenticated cannot call the owner-explicit import RPC directly');
select throws_ok($$update public.personal_ai_declarations set status = 'EXCLUDED' where owner_clerk_id = 'user-b'$$, '42501', null, 'authenticated cannot update another declaration directly');
select throws_ok($$insert into public.personal_ai_declarations (owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot, methodology_version, factor_version) values ('user-a', now(), now() + interval '1 day', '{}'::jsonb, '{}'::jsonb, 'x', 'x')$$, '42501', null, 'authenticated cannot insert a declaration directly');
select throws_ok($$update public.personal_ai_declarations set status = 'EXCLUDED' where owner_clerk_id = 'user-a'$$, '42501', null, 'authenticated cannot bypass the status RPC');
select throws_ok($$select * from public.confirm_personal_ai_import('[]'::jsonb)$$, '42501', null, 'authenticated cannot call the internal import RPC');
select throws_ok($$select * from public.save_personal_ai_chat_scenario(null::uuid, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'x', 'x')$$, '42501', null, 'authenticated cannot call the internal scenario RPC');
select lives_ok($$
  select * from pg_temp.personal_ai_save_test(
    null,
    jsonb_build_object(
      'normalizationVersion', 'personal-ai-declaration-v1', 'provider', 'OPENAI', 'source', 'MANUAL',
      'sourceVersion', null, 'provenance', 'USER_DECLARED', 'granularity', 'UNKNOWN',
      'periodStartUtc', '2026-03-01T00:00:00.000Z', 'periodEndUtc', '2026-04-01T00:00:00.000Z',
      'modelRaw', null, 'modelCanonical', null, 'operator', null, 'execution', 'CLOUD',
      'inferenceRegion', null, 'access', 'UNKNOWN', 'requestCount', null,
      'tokens', jsonb_build_object('inputTotal', null, 'inputUncached', null, 'cacheRead', null, 'cacheWrite', null,
        'outputVisible', null, 'outputReasoning', null, 'outputTotal', null, 'reasoningRelation', 'UNKNOWN', 'logicalTotal', null),
      'modality', jsonb_build_object('images', null, 'audioMinutes', null, 'videoSeconds', null),
      'energy', jsonb_build_object('kwh', null, 'boundary', null, 'evidence', null, 'averageWatts', null, 'durationSeconds', null, 'idleWatts', null)
    ),
    '{"version":"personal-ai-chat-usage-v1","sourceKind":"SELF_REPORTED_CHAT_USAGE","chatbot":"CHATGPT","chatbotLabel":null,"accessMode":"FREE","frequency":"DAILY","exchanges":3,"questionCharacters":100,"answerCharacters":400,"imageUse":null,"audioUse":false}'::jsonb,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'personal-ai-v1', '{}'
  )
$$, 'owner A can privately save a self-reported chatbot scenario');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 1, 'quick scenario is persisted once under owner A');
select lives_ok($$select * from pg_temp.personal_ai_save_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
  (select declaration from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
  (select quick_scenario from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
  (select snapshot from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
  'personal-ai-v1', '{}', 'EXCLUDED'
)$$, 'scenario edit and exclusion are committed through one server RPC');
select is((select status from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 'EXCLUDED', 'scenario edit does not drop the simultaneous status change');
select lives_ok($$select * from pg_temp.personal_ai_status_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 'ACTIVE'
)$$, 'quick scenario reactivation uses the owner lock');
select throws_ok($$
  select * from pg_temp.personal_ai_save_test(
    null,
    jsonb_build_object(
      'normalizationVersion', 'personal-ai-declaration-v1', 'provider', 'OPENAI', 'source', 'MANUAL',
      'sourceVersion', null, 'provenance', 'USER_DECLARED', 'granularity', 'UNKNOWN',
      'periodStartUtc', '2026-03-15T00:00:00.000Z', 'periodEndUtc', '2026-04-15T00:00:00.000Z',
      'modelRaw', null, 'modelCanonical', null, 'operator', null, 'execution', 'CLOUD',
      'inferenceRegion', null, 'access', 'UNKNOWN', 'requestCount', null,
      'tokens', jsonb_build_object('inputTotal', null, 'inputUncached', null, 'cacheRead', null, 'cacheWrite', null,
        'outputVisible', null, 'outputReasoning', null, 'outputTotal', null, 'reasoningRelation', 'UNKNOWN', 'logicalTotal', null),
      'modality', jsonb_build_object('images', null, 'audioMinutes', null, 'videoSeconds', null),
      'energy', jsonb_build_object('kwh', null, 'boundary', null, 'evidence', null, 'averageWatts', null, 'durationSeconds', null, 'idleWatts', null)
    ),
    '{"version":"personal-ai-chat-usage-v1","sourceKind":"SELF_REPORTED_CHAT_USAGE","chatbot":"CHATGPT","chatbotLabel":null,"accessMode":"FREE","frequency":"DAILY","exchanges":2,"questionCharacters":50,"answerCharacters":100,"imageUse":null,"audioUse":null}'::jsonb,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb, 'personal-ai-v1', '{}'
  )
$$, '23P01', null, 'overlapping quick scenarios with null source identities are compared by provider, model and period');
select lives_ok($$
  select * from pg_temp.personal_ai_save_test(
    null,
    jsonb_build_object(
      'normalizationVersion', 'personal-ai-declaration-v1', 'provider', 'OPENAI', 'source', 'MANUAL',
      'sourceVersion', null, 'provenance', 'USER_DECLARED', 'granularity', 'UNKNOWN',
      'periodStartUtc', '2026-03-01T00:00:00.000Z', 'periodEndUtc', '2026-04-01T00:00:00.000Z',
      'modelRaw', null, 'modelCanonical', null, 'operator', null, 'execution', 'CLOUD',
      'inferenceRegion', null, 'access', 'UNKNOWN', 'requestCount', null,
      'tokens', jsonb_build_object('inputTotal', null, 'inputUncached', null, 'cacheRead', null, 'cacheWrite', null,
        'outputVisible', null, 'outputReasoning', null, 'outputTotal', null, 'reasoningRelation', 'UNKNOWN', 'logicalTotal', null),
      'modality', jsonb_build_object('images', null, 'audioMinutes', null, 'videoSeconds', null),
      'energy', jsonb_build_object('kwh', null, 'boundary', null, 'evidence', null, 'averageWatts', null, 'durationSeconds', null, 'idleWatts', null)
    ),
    '{"version":"personal-ai-chat-usage-v1","sourceKind":"SELF_REPORTED_CHAT_USAGE","chatbot":"CHATGPT","chatbotLabel":null,"accessMode":"SUBSCRIPTION","frequency":"DAILY","exchanges":5,"questionCharacters":100,"answerCharacters":400,"imageUse":null,"audioUse":false}'::jsonb,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'personal-ai-v1', '{}'
  )
$$, 'retry of the same chatbot and period updates its stable owner scope');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 1, 'quick scenario retry is idempotent');
select is((select quick_scenario ->> 'exchanges' from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), '5', 'retry replaces declared counts without addition');
select throws_ok($$
  select * from pg_temp.personal_ai_save_test(
    (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
    jsonb_set((select declaration from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), '{tokens,inputTotal}', '1'::jsonb),
    (select quick_scenario from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
    (select snapshot from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'),
    'personal-ai-v1', '{}'
  )
$$, '23514', null, 'quick scenario requires each measured token value to remain unknown');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'), '{provider}', '"OPENAI"'::jsonb), '{access}', '"UNKNOWN"'::jsonb) || jsonb_build_object('periodStartUtc', '2026-03-01T00:00:00.000Z', 'periodEndUtc', '2026-04-01T00:00:00.000Z'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('2', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64)),
    'normalized_content_hash', repeat('3', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '23P01', null, 'overlapping import cannot be added beside active chatbot activity');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('2', 64)), 0, 'overlap conflict rolls back the import row');
select lives_ok($$select * from pg_temp.personal_ai_status_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 'EXCLUDED'
)$$, 'owner can exclude a quick scenario before reconciling an import');
select lives_ok($$
  with base as (
    select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'
  ), providers(provider, hash_char) as (
    values ('GOOGLE', 'c'), ('OPENAI', 'd'), ('OTHER', 'e'), ('ANTHROPIC', 'f')
  )
  select * from pg_temp.personal_ai_confirm_test((
    select jsonb_agg(jsonb_build_object(
      'declaration', jsonb_set(
        jsonb_set(jsonb_set(jsonb_set(base.declaration, '{provider}', to_jsonb(providers.provider)), '{access}', '"UNKNOWN"'::jsonb),
          '{periodStartUtc}', 'null'::jsonb), '{periodEndUtc}', 'null'::jsonb),
      'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
      'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
      'source_identity_hash', repeat(providers.hash_char, 64),
      'source_scope', jsonb_build_object('response_id', repeat(providers.hash_char, 64)),
      'normalized_content_hash', repeat('1', 64),
      'import_metadata', jsonb_build_object('provider', providers.provider, 'granularity', 'UNKNOWN', 'completeness', 'PARTIAL'),
      'cost_amount', null, 'cost_currency', null
    )) from base cross join providers
  ))
$$, 'Gemini, Codex, PDF and CSV imports persist with both period bounds unknown');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-a'
  and source_identity_hash in (repeat('c', 64), repeat('d', 64), repeat('e', 64), repeat('f', 64))
  and period_start_utc is null and period_end_utc is null
  and declaration -> 'periodStartUtc' = 'null'::jsonb and declaration -> 'periodEndUtc' = 'null'::jsonb),
  4, 'unknown import periods remain consistently null in columns and declaration JSON');
select lives_ok($$select pg_temp.personal_ai_status_test(id, 'EXCLUDED')
  from public.personal_ai_declarations where owner_clerk_id = 'user-a'
    and source_identity_hash in (repeat('c', 64), repeat('d', 64), repeat('e', 64), repeat('f', 64))$$,
  'unknown-period fixture imports can be excluded without creating a period');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
      '{provider}', '"OTHER"'::jsonb), '{periodStartUtc}', '"2026-05-01T00:00:00.000Z"'::jsonb), '{periodEndUtc}', 'null'::jsonb),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('8', 64), 'source_scope', jsonb_build_object('file_hash', repeat('8', 64)),
    'normalized_content_hash', repeat('9', 64),
    'import_metadata', '{"provider":"OTHER","granularity":"UNKNOWN","completeness":"PARTIAL"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '23514', null, 'a half-known period is rejected by the table contract');
select throws_ok($$
  select * from pg_temp.personal_ai_save_test(
    null,
    jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
      '{periodStartUtc}', 'null'::jsonb), '{periodEndUtc}', 'null'::jsonb),
    '{"version":"personal-ai-chat-usage-v1","sourceKind":"SELF_REPORTED_CHAT_USAGE","chatbot":"CHATGPT","chatbotLabel":null,"accessMode":"FREE","frequency":"UNKNOWN","exchanges":null,"questionCharacters":null,"answerCharacters":null,"imageUse":null,"audioUse":null}'::jsonb,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb, 'personal-ai-v1', '{}'
  )
$$, '23514', null, 'a quick scenario still requires a complete period');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'), '{provider}', '"OPENAI"'::jsonb), '{access}', '"UNKNOWN"'::jsonb) || jsonb_build_object('periodStartUtc', '2026-03-01T00:00:00.000Z', 'periodEndUtc', '2026-04-01T00:00:00.000Z'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('2', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64)),
    'normalized_content_hash', repeat('3', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'owner can import after excluding the overlapping scenario');
select throws_ok($$select * from pg_temp.personal_ai_status_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and quick_scenario ->> 'chatbot' = 'CHATGPT'), 'ACTIVE'
)$$, '23P01', null, 'reactivation is rejected while a covering import is active');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('a', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('2', 64)), 'normalized_content_hash', repeat('b', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'owner A can atomically confirm one normalized import row');
select is((select import_revision from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('a', 64)), 1, 'first import revision starts at one');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where source_identity_hash = repeat('a', 64)),
      '{modelRaw}', '"gpt-4.1"'::jsonb), '{modelCanonical}', '"gpt-4.1"'::jsonb),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('0', 64),
    'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('3', 64)),
    'normalized_content_hash', repeat('0', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'known model import can coexist with unknown model when an attested API-key scope is disjoint');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('1', 64),
    'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('3', 64)),
    'normalized_content_hash', repeat('1', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '23P01', 'overlapping personal AI import scope', 'an unknown incoming model conflicts with an active known model in the same scope');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('a', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('2', 64)), 'normalized_content_hash', repeat('b', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'exact retry remains a successful idempotent confirmation');
select is((select import_revision from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('a', 64)), 1, 'exact retry does not create a revision');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('a', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('2', 64)), 'normalized_content_hash', repeat('c', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'late revision replaces same stable source identity');
select is((select import_revision from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('a', 64)), 2, 'changed normalized contents increment the revision');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
      '{modelRaw}', '"gpt-4.1"'::jsonb), '{modelCanonical}', '"gpt-4.1"'::jsonb),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('f', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('2', 64)), 'normalized_content_hash', repeat('e', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '23P01', 'overlapping personal AI import scope', 'a known incoming model conflicts with an active unknown model in the same scope');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('9', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('4', 64)),
    'normalized_content_hash', repeat('8', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'different attested api_key_id scopes may overlap without merging');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('7', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64)),
    'normalized_content_hash', repeat('6', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '23P01', 'overlapping personal AI import scope', 'an aggregate scope cannot silently replace or overlap its api-key subset');
select lives_ok($$select * from pg_temp.personal_ai_status_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('2', 64)), 'EXCLUDED'
)$$,
  'an imported source can be excluded while retaining its identity');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where source_identity_hash = repeat('2', 64)),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('7', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64)),
    'normalized_content_hash', repeat('7', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'a concurrent source can be confirmed after the prior source is excluded');
select throws_ok($$select * from pg_temp.personal_ai_status_test(
  (select id from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('2', 64)), 'ACTIVE'
)$$,
  '23P01', null, 'reactivation of an import is rejected while a compatible source is active');
select throws_ok($$update public.personal_ai_declarations set declaration = jsonb_set(declaration, '{modelRaw}', '"manual-edit"'::jsonb)
  where owner_clerk_id = 'user-a' and source_identity_hash = repeat('a', 64)$$,
  '42501', null, 'direct RLS content edits cannot bypass versioned import confirmation');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('5', 64), 'source_scope', jsonb_build_object('api_key_id', 'raw-provider-id'),
    'normalized_content_hash', repeat('4', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, '22023', 'invalid import identity scope', 'raw provider identifiers cannot be stored as source scope');
select throws_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(
    jsonb_build_object(
      'declaration', jsonb_set(
        jsonb_set(
          (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'),
          '{provider}', '"OPENAI"'::jsonb
        ) || jsonb_build_object(
          'periodStartUtc', '2026-03-01T00:00:00.000Z',
          'periodEndUtc', '2026-04-01T00:00:00.000Z'
        ),
        '{access}', '"UNKNOWN"'::jsonb
      ),
      'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
      'methodology_version', 'personal-ai-v1',
      'factor_version', '{}',
      'source_identity_hash', repeat('6', 64),
      'source_scope', jsonb_build_object('project_id', repeat('6', 64), 'api_key_id', repeat('7', 64)),
      'normalized_content_hash', repeat('8', 64),
      'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE"}'::jsonb
    ),
    jsonb_build_object('unexpected', true)
  ))
$$, '22023', 'invalid import row shape', 'malformed row rejects the whole import batch');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-a' and source_identity_hash = repeat('6', 64)), 0, 'failed multi-row import rolls back the preceding valid row');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user-b"}', true);
select is((select count(*)::integer from public.personal_ai_declarations where quick_scenario is not null), 0, 'owner B cannot read owner A quick scenario');
select throws_ok($$
  select * from pg_temp.personal_ai_save_test(
    '10000000-0000-4000-8000-000000000001'::uuid,
    (select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000002'),
    '{"version":"personal-ai-chat-usage-v1","sourceKind":"SELF_REPORTED_CHAT_USAGE","chatbot":"CHATGPT","chatbotLabel":null,"accessMode":"FREE","frequency":"UNKNOWN","exchanges":null,"questionCharacters":null,"answerCharacters":null,"imageUse":null,"audioUse":null}'::jsonb,
    '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'personal-ai-v1', '{}'
  )
$$, '42501', 'personal AI scenario not found', 'owner B cannot update owner A quick scenario by ID');
select lives_ok($$
  select * from pg_temp.personal_ai_confirm_test(jsonb_build_array(jsonb_build_object(
    'declaration', jsonb_set(jsonb_set((select declaration from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000002'), '{periodStartUtc}', 'null'::jsonb), '{periodEndUtc}', 'null'::jsonb),
    'snapshot', '{"physicalTotals":{},"methodologyTrace":{}}'::jsonb,
    'methodology_version', 'personal-ai-v1', 'factor_version', '{}',
    'source_identity_hash', repeat('a', 64), 'source_scope', jsonb_build_object('project_id', repeat('1', 64), 'api_key_id', repeat('2', 64)), 'normalized_content_hash', repeat('b', 64),
    'import_metadata', '{"provider":"OPENAI","granularity":"AGGREGATE","completeness":"COMPLETE","freshnessUtc":null}'::jsonb,
    'cost_amount', null, 'cost_currency', null
  )))
$$, 'owner B can use the same source hash in the B-scoped namespace');
select is((select count(*)::integer from public.personal_ai_declarations where source_identity_hash = repeat('a', 64) and owner_clerk_id = 'user-a'), 0, 'B cannot query A import by stable source identity');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user-a"}', true);
select is((select count(*)::integer from public.personal_ai_declarations where source_identity_hash = repeat('a', 64)), 1, 'A import identity remains isolated from B');
select lives_ok($$delete from public.personal_ai_declarations where source_identity_hash = repeat('a', 64)$$, 'A can delete its own imported declaration');
select is((select count(*)::integer from public.personal_ai_declarations where source_identity_hash = repeat('a', 64)), 0, 'deleted import is no longer visible to A');
select is((select count(*)::integer from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001' and status = 'ACTIVE'), 1, 'A can still read own active declaration');
select throws_ok($$update public.personal_ai_declarations set owner_clerk_id = 'user-b' where id = '10000000-0000-4000-8000-000000000001'$$, '42501', null, 'owner column cannot be updated');
select lives_ok($$select * from pg_temp.personal_ai_status_test('10000000-0000-4000-8000-000000000001'::uuid, 'EXCLUDED')$$, 'A can exclude own declaration through the status RPC');
select is((select count(*)::integer from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001' and status = 'EXCLUDED'), 1, 'A exclusion is persisted');
select lives_ok($$delete from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000002'$$, 'A delete against B is filtered by RLS');
select lives_ok($$delete from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'$$, 'A can delete own declaration');
select is((select count(*)::integer from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001'), 0, 'deleted declaration is no longer visible');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select is((select count(*)::integer from public.personal_ai_declarations), 0, 'empty Clerk subject cannot access declarations');

select * from finish();
rollback;
