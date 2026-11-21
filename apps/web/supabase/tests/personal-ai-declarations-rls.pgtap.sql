begin;

select plan(22);

select ok(has_table('public', 'personal_ai_declarations'), 'private declarations table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.personal_ai_declarations'::regclass), 'row level security is enabled');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'SELECT'), 'anon cannot read declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'INSERT'), 'anon cannot insert declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'UPDATE'), 'anon cannot update declarations');
select ok(not has_table_privilege('anon', 'public.personal_ai_declarations', 'DELETE'), 'anon cannot delete declarations');
select ok(has_table_privilege('authenticated', 'public.personal_ai_declarations', 'SELECT'), 'authenticated role can select through RLS');
select ok(has_any_column_privilege('authenticated', 'public.personal_ai_declarations', 'INSERT'), 'authenticated role can insert granted columns');
select ok(has_table_privilege('authenticated', 'public.personal_ai_declarations', 'DELETE'), 'authenticated role can delete through RLS');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
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
  fixture.declaration, fixture.snapshot, 'personal-ai-v1', 'factors-v1'
from fixture
cross join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'user-a'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'user-b')
) as fixture_row(id, owner_id);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select count(*) from public.personal_ai_declarations$$, '42501', null, 'anon query is denied');
select throws_ok($$insert into public.personal_ai_declarations (period_start_utc, period_end_utc, declaration, snapshot, methodology_version, factor_version) values (now(), now() + interval '1 day', '{}'::jsonb, '{}'::jsonb, 'x', 'x')$$, '42501', null, 'anon insert is denied');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user-a"}', true);
select is((select count(*)::integer from public.personal_ai_declarations), 1, 'A sees only A declaration');
select is((select count(*)::integer from public.personal_ai_declarations where owner_clerk_id = 'user-b'), 0, 'A cannot query B declaration');
select lives_ok($$update public.personal_ai_declarations set status = 'EXCLUDED' where owner_clerk_id = 'user-b'$$, 'A update against B is filtered by RLS');
select is((select count(*)::integer from public.personal_ai_declarations where id = '10000000-0000-4000-8000-000000000001' and status = 'ACTIVE'), 1, 'A can still read own active declaration');
select throws_ok($$update public.personal_ai_declarations set owner_clerk_id = 'user-b' where id = '10000000-0000-4000-8000-000000000001'$$, '42501', null, 'owner column cannot be updated');
select lives_ok($$update public.personal_ai_declarations set status = 'EXCLUDED' where id = '10000000-0000-4000-8000-000000000001'$$, 'A can exclude own declaration');
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
