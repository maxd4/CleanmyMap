begin;

select plan(15);

select has_function('public', 'spogomi_division_regulation_is_complete', array['uuid','uuid','text'], 'the certification predicate exists');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"spogomi-mapping-coherence-pgtap"}', true);

insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'spogomi-mapping-coherence-pgtap', current_date, 'Fixture mapping coherence', 'pending');
insert into public.spogomi_events (
  id, action_id, created_by_clerk_id, name, mode, state, starts_at,
  regulation_version, regulation_status, regulation_source_reference,
  regulation_config, team_size_config, location_label
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'spogomi-mapping-coherence-pgtap', 'Fixture mapping coherence', 'mixed', 'draft', now(),
  'pending', 'incomplete', null, '{}'::jsonb, '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb,
  'Fixture mapping coherence'
);
insert into public.spogomi_divisions (
  id, event_id, division_type, division_key, regulation_version,
  regulation_status, regulation_config, team_size_config
) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'casual', 'casual', 'pending', 'incomplete', '{}'::jsonb, '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'world_cup', 'world_cup', 'pending', 'incomplete', '{}'::jsonb, '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb);

select lives_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 0,
  'spogomi-mapping-coherence-pgtap', 'casual-v1', 'complete', 'synthetic://mapping-coherence/casual-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"plastic","label":"Plastique","measurementKind":"mass","unit":"g","coefficient":1,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":0,"isComplete":true},{"code":"packaging","label":"Emballages","measurementKind":"mass","unit":"g","coefficient":2,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":1,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"plastic","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null},{"categoryCode":"packaging","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, 'two sporting categories may share one environmental category');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'the coherent Casual mapping is complete');
select is((select count(distinct environmental_category_slug) from public.spogomi_environment_category_mappings where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and division_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'), 1::bigint, 'the shared environmental slug is preserved without a bijection requirement');

select lives_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1,
  'spogomi-mapping-coherence-pgtap', 'world-cup-v1', 'complete', 'synthetic://mapping-coherence/world-cup-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":null,"maxMembers":null}}'::jsonb,
  '[{"code":"butts","label":"Mégots","measurementKind":"count","unit":"objet","coefficient":3,"coefficientStatus":"confirmed","environmentalCategorySlug":"cigarette_butt","displayOrder":0,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"butts","environmentalCategorySlug":"cigarette_butt","sourceField":"object_count","sourceUnit":"objet","targetUnit":"count","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":true,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, 'the World Cup can use its own coherent mapping');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'world-cup-v1'), 'the coherent World Cup mapping is complete without Casual contamination');
select is((select count(*) from public.spogomi_environment_category_mappings where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and division_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and environmental_category_slug = 'plastic'), 2::bigint, 'Casual keeps both of its own mappings');

select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-mapping-coherence-pgtap', 'casual-v1', 'complete', 'synthetic://mapping-coherence/casual-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"plastic","label":"Plastique","measurementKind":"mass","unit":"g","coefficient":1,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":0,"isComplete":true},{"code":"packaging","label":"Emballages","measurementKind":"mass","unit":"g","coefficient":2,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":1,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"plastic","environmentalCategorySlug":"cigarette_butt","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":true,"mappingStatus":"mapped","exclusionReason":null},{"categoryCode":"packaging","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, '23514', null, 'a contradictory environmental slug is rejected');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'a rejected slug does not alter the prior Casual configuration');

select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-mapping-coherence-pgtap', 'casual-v1', 'complete', 'synthetic://mapping-coherence/casual-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"plastic","label":"Plastique","measurementKind":"mass","unit":"g","coefficient":1,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":0,"isComplete":true},{"code":"packaging","label":"Emballages","measurementKind":"mass","unit":"g","coefficient":2,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":1,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"plastic","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":true,"mappingStatus":"mapped","exclusionReason":null},{"categoryCode":"packaging","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, '23514', null, 'a contradictory isMegots flag is rejected');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'a rejected isMegots flag does not alter the prior Casual configuration');

select throws_ok($$select * from public.spogomi_update_division_regulation(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1,
  'spogomi-mapping-coherence-pgtap', 'casual-v1', 'complete', 'synthetic://mapping-coherence/casual-v1',
  '{"rounding":{"decimals":0,"mode":"half_up"},"penalties":[],"eligibility":{"minimumPresentParticipants":1,"requiresAllCategories":true},"tiebreakers":["sporting_score"]}'::jsonb,
  '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb,
  '[{"code":"plastic","label":"Plastique","measurementKind":"mass","unit":"g","coefficient":1,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":0,"isComplete":true},{"code":"packaging","label":"Emballages","measurementKind":"mass","unit":"g","coefficient":2,"coefficientStatus":"confirmed","environmentalCategorySlug":"plastic","displayOrder":1,"isComplete":true}]'::jsonb,
  '[{"categoryCode":"plastic","environmentalCategorySlug":"plastic","sourceField":"mass_grams","sourceUnit":"g","targetUnit":"grams","unitFactorToTarget":1,"countsTowardTotal":true,"isMegots":false,"mappingStatus":"mapped","exclusionReason":null}]'::jsonb
)$$, '23514', null, 'a missing category mapping is rejected');
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'a missing mapping does not alter the prior Casual configuration');

update public.spogomi_environment_category_mappings
   set environmental_category_slug = 'cigarette_butt', is_megots = true
 where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
   and division_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
   and category_code = 'plastic';
select ok(not public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'the certification predicate rejects a persisted contradictory mapping');
update public.spogomi_environment_category_mappings
   set environmental_category_slug = 'plastic', is_megots = false
 where event_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
   and division_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
   and category_code = 'plastic';
select ok(public.spogomi_division_regulation_is_complete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'casual-v1'), 'the predicate accepts the restored coherent mapping');

select * from finish();
rollback;
