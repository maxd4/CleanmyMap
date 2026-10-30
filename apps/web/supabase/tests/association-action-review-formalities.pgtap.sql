begin;

select plan(27);

select is(
  public.is_association_action_formalities_ready('{}'::jsonb),
  false,
  'an absent workflow is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","progress":[]}}'::jsonb
  ),
  false,
  'a workflow without a trace is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[42]},"progress":[]}}'::jsonb
  ),
  false,
  'a non-object formality entry is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"optional","requirementStatus":"recommended","procedureKind":"information_only","sourceId":null}]},"progress":[{"formalityId":"optional","userStatus":"not_started","contentVersion":"v1","statusChangedAt":null,"proof":null,"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb
  ),
  true,
  'a valid workflow with no required formality is ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"required","requirementStatus":"required","procedureKind":"city_aot","sourceId":null}]},"progress":[{"formalityId":"required","userStatus":"prepared","contentVersion":"v1","statusChangedAt":null,"proof":null,"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb
  ),
  false,
  'an unsent required formality is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"required","requirementStatus":"required","procedureKind":"city_aot","sourceId":null}]},"progress":[{"formalityId":"required","userStatus":"sent","contentVersion":"v1","statusChangedAt":null,"proof":null,"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb
  ),
  false,
  'a sent required formality without proof is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"required","requirementStatus":"required","procedureKind":"city_aot","sourceId":null}]},"progress":[{"formalityId":"required","userStatus":"sent","contentVersion":"v1","statusChangedAt":null,"proof":{"kind":"nonsense","reference":null,"recordedAt":"2026-10-30T10:00:00Z"},"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb
  ),
  false,
  'a proof with an invalid kind is not ready'
);
select is(
  public.is_association_action_formalities_ready(
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"required","requirementStatus":"required","procedureKind":"city_aot","sourceId":null}]},"progress":[{"formalityId":"required","userStatus":"sent","contentVersion":"v1","statusChangedAt":"2026-10-30T10:00:00Z","proof":{"kind":"user_declared","reference":null,"recordedAt":"2026-10-30T10:00:00Z"},"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb
  ),
  true,
  'a conforming user declaration with an optional reference is ready'
);
select ok(
  public.is_association_action_formalities_ready('{}'::jsonb) is not null,
  'the formalities helper is strictly boolean'
);

select ok(
  not has_function_privilege('anon', 'public.is_association_action_formalities_ready(jsonb)', 'EXECUTE'),
  'anon cannot execute the formalities helper'
);
select ok(
  not has_function_privilege('authenticated', 'public.is_association_action_formalities_ready(jsonb)', 'EXECUTE'),
  'authenticated cannot execute the formalities helper'
);
select ok(
  has_function_privilege('service_role', 'public.is_association_action_formalities_ready(jsonb)', 'EXECUTE'),
  'service_role retains the formalities helper'
);
select ok(
  not has_function_privilege('anon', 'public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz)', 'EXECUTE'),
  'anon cannot execute the review decision RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.decide_association_action_review(uuid, text, text, text, text, text, timestamptz)', 'EXECUTE'),
  'authenticated cannot execute the review decision RPC'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select public.decide_association_action_review(gen_random_uuid(), 'approve', 'anon', 'anon-op', 'not allowed')$$,
  '42501',
  null,
  'anon is rejected by the review decision RPC'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user"}', true);
select throws_ok(
  $$select public.decide_association_action_review(gen_random_uuid(), 'approve', 'user', 'authenticated-op', 'not allowed')$$,
  '42501',
  null,
  'authenticated is rejected by the review decision RPC'
);
reset role;

create temp table association_action_review_formality_fixture (
  invalid_action_id uuid not null,
  valid_action_id uuid not null
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"fixture-service"}', true);

with invalid_action as (
  insert into public.actions (
    created_by_clerk_id, action_date, location_label, organizer_name,
    organizer_type, action_phase, status, preparation_data,
    moderation_visibility, published_at
  ) values (
    'review-fixture-user', current_date, 'Fixture location', 'Fixture association',
    'association', 'pre_action', 'pending', '{}'::jsonb,
    'visible', null
  ) returning id
), valid_action as (
  insert into public.actions (
    created_by_clerk_id, action_date, location_label, organizer_name,
    organizer_type, action_phase, status, preparation_data,
    moderation_visibility, published_at
  ) values (
    'review-fixture-user', current_date, 'Fixture location', 'Fixture association',
    'association', 'pre_action', 'pending',
    '{"formalitiesWorkflow":{"schemaVersion":"action-formalities-workflow-v1","contentVersion":"v1","trace":{"formalities":[{"id":"required","requirementStatus":"required","procedureKind":"city_aot","sourceId":null}]},"progress":[{"formalityId":"required","userStatus":"sent","contentVersion":"v1","statusChangedAt":"2026-10-30T10:00:00Z","proof":{"kind":"user_declared","reference":null,"recordedAt":"2026-10-30T10:00:00Z"},"active":true,"validForQualification":true,"invalidatedAt":null}]}}'::jsonb,
    'visible', null
  ) returning id
)
insert into association_action_review_formality_fixture (invalid_action_id, valid_action_id)
select invalid_action.id, valid_action.id
from invalid_action cross join valid_action;

update public.actions
set review_state = 'pending_review'
where id in (
  select invalid_action_id from association_action_review_formality_fixture
  union all
  select valid_action_id from association_action_review_formality_fixture
);

select is(
  (public.decide_association_action_review(
    (select invalid_action_id from association_action_review_formality_fixture),
    'approve', 'reviewer', 'invalid-formalities-op', 'Invalid formalities fixture'
  ) ->> 'status'),
  'formalities_not_ready',
  'approval refuses an invalid workflow'
);
select is(
  (select review_state from public.actions where id = (select invalid_action_id from association_action_review_formality_fixture)),
  'pending_review',
  'invalid approval preserves review_state'
);
select ok(
  (select published_at from public.actions where id = (select invalid_action_id from association_action_review_formality_fixture)) is null,
  'invalid approval preserves published_at'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'review-fixture-user' and payload ->> 'actionId' = (select invalid_action_id::text from association_action_review_formality_fixture)),
  0,
  'invalid approval creates no success notification'
);

select is(
  (public.decide_association_action_review(
    (select valid_action_id from association_action_review_formality_fixture),
    'approve', 'reviewer', 'valid-formalities-op', 'Valid formalities fixture'
  ) ->> 'status'),
  'updated',
  'approval accepts a conforming proof'
);
select is(
  (select review_state from public.actions where id = (select valid_action_id from association_action_review_formality_fixture)),
  'approved',
  'valid approval persists approved review_state'
);
select ok(
  (select published_at from public.actions where id = (select valid_action_id from association_action_review_formality_fixture)) is not null,
  'valid approval publishes the action'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'review-fixture-user' and payload ->> 'actionId' = (select valid_action_id::text from association_action_review_formality_fixture)),
  1,
  'valid approval creates one notification'
);
select is(
  (public.decide_association_action_review(
    (select valid_action_id from association_action_review_formality_fixture),
    'approve', 'reviewer', 'valid-formalities-op', 'Valid formalities fixture'
  ) ->> 'status'),
  'unchanged',
  'the same operation is idempotent'
);
select is(
  (public.decide_association_action_review(
    (select valid_action_id from association_action_review_formality_fixture),
    'approve', 'reviewer', 'conflicting-formalities-op', 'Conflicting formalities fixture', 'pending_review'
  ) ->> 'status'),
  'conflict',
  'a stale expected state is rejected'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'review-fixture-user' and payload ->> 'actionId' = (select valid_action_id::text from association_action_review_formality_fixture)),
  1,
  'retry and conflict do not duplicate the success notification'
);

select * from finish();
rollback;
