begin;

select plan(25);

select has_function('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], 'organizer regulation configuration overload exists');
select function_privs_are('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], 'service_role', array['EXECUTE'], 'service_role can execute the configuration RPC');
select function_privs_are('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], 'anon', array[]::text[], 'anon cannot execute the configuration RPC');
select function_privs_are('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], 'authenticated', array[]::text[], 'authenticated cannot execute the configuration RPC');
select has_function('public', 'spogomi_division_regulation_is_complete', array['uuid','uuid','text'], 'certification completeness helper exists');
select has_column('public', 'spogomi_category_rules', 'division_id', 'categories are division-scoped');
select has_column('public', 'spogomi_environment_category_mappings', 'division_id', 'mappings are division-scoped');
select has_column('public', 'spogomi_result_submissions', 'division_id', 'submissions are division-scoped');
select ok(position('for update' in lower(pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure))) > 0, 'configuration locks the event and division');
select ok(position('composition_revision + 1' in pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure)) > 0, 'successful configuration advances the revision');
select ok(position('spogomi_result_submissions' in pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure)) > 0, 'existing submissions are protected');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"spogomi-regulation-pgtap"}', true);

insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'spogomi-regulation-pgtap', current_date, 'Fixture SPOGOMI', 'pending');
insert into public.spogomi_events (
  id, action_id, created_by_clerk_id, name, mode, state, starts_at,
  regulation_version, regulation_status, regulation_source_reference,
  regulation_config, team_size_config, location_label
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'spogomi-regulation-pgtap', 'Fixture SPOGOMI', 'casual', 'draft', now(),
  'pending', 'incomplete', null, '{}'::jsonb, '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb,
  'Fixture SPOGOMI'
);
insert into public.spogomi_divisions (
  id, event_id, division_type, division_key, regulation_version,
  regulation_status, regulation_config, team_size_config
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'casual', 'casual', 'pending', 'incomplete', '{}'::jsonb,
  '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb
);

select lives_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 0,
  'spogomi-regulation-pgtap', 'casual-test-v1', 'incomplete', null,
  '{"rounding":null,"penalties":[],"eligibility":null,"tiebreakers":[]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"mass","label":"Masse","measurementKind":"mass","unit":"g","coefficient":null,"coefficientStatus":"unknown","environmentalCategorySlug":null,"displayOrder":0,"isComplete":false}]'::jsonb,
  '[{"categoryCode":"mass","environmentalCategorySlug":null,"sourceField":null,"sourceUnit":"g","targetUnit":null,"unitFactorToTarget":null,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"unmapped","exclusionReason":"À documenter"}]'::jsonb
)$$, 'an incomplete regulation can retain unknown coefficients');
select is((select composition_revision from public.spogomi_events where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1::bigint, 'incomplete configuration advances the revision once');
select is((select actor_clerk_id
             from public.spogomi_event_change_history
            where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
            order by created_at desc, id desc
            limit 1), 'spogomi-regulation-pgtap', 'division configuration history keeps the verified organizer actor');

select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-regulation-pgtap', 'casual-test-v1', 'complete', 'synthetic://rules-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"mass","label":"Masse","measurementKind":"mass","unit":"g","coefficient":null,"coefficientStatus":"unknown","environmentalCategorySlug":"mass","displayOrder":0,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"mass","environmentalCategorySlug":"mass","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
  )$$, '23514', null, 'unknown coefficients are rejected for a complete regulation');
select is((select coefficient_status from public.spogomi_category_rules where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'unknown', 'failed complete save is atomic for category rows');

select lives_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-regulation-pgtap', 'casual-test-v1', 'complete', 'synthetic://rules-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"mass","label":"Masse","measurementKind":"mass","unit":"g","coefficient":1,"coefficientStatus":"confirmed","environmentalCategorySlug":"mass","displayOrder":0,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"mass","environmentalCategorySlug":"mass","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, 'a complete regulation with mapped environmental data is accepted');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-test-v1'), 'the valid complete regulation satisfies the SQL predicate');
select is((select composition_revision from public.spogomi_events where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 2::bigint, 'complete configuration advances the revision');

select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-regulation-pgtap', 'casual-test-v1', 'incomplete', null,
  '{"rounding":null,"penalties":[],"eligibility":null,"tiebreakers":[]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, '[]'::jsonb, '[]'::jsonb
)$$, '40001', null, 'a stale revision is rejected');

select lives_ok($$insert into public.spogomi_teams (id, event_id, team_number, public_name)
  values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'Fixture team')$$, 'a fixture team can be created');
select lives_ok($$insert into public.spogomi_result_submissions (event_id, team_id, version, regulation_version)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1, 'casual-test-v1')$$, 'a fixture submission can be created');
select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 3,
  'spogomi-regulation-pgtap', 'casual-test-v1', 'incomplete', null,
  '{"rounding":null,"penalties":[],"eligibility":null,"tiebreakers":[]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, '[]'::jsonb, '[]'::jsonb
)$$, '23514', null, 'configuration is refused after a result submission');
select is((select composition_revision from public.spogomi_events where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 3::bigint, 'refused submission does not advance the revision');
select is((select regulation_status from public.spogomi_divisions where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 'complete', 'refused submission preserves the prior regulation');

select * from finish();
rollback;
