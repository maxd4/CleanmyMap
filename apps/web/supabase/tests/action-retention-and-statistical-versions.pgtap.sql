begin;

select plan(15);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"action-retention-test"}', true);

create temp table retention_fixture_ids (
  fixture text primary key,
  action_id uuid not null
);

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state,
    waste_kg, cigarette_butts, volunteers_count
  ) values (
    'retention-fixture', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z',
    current_date - 400, 'Abandoned draft', 'pending', 'post_action_draft',
    'visible', 'public', 'draft', 3, 10, 2
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'abandoned', id from inserted;

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state
  ) values (
    'retention-fixture', '2025-01-01T00:00:00Z', timezone('utc', now()),
    current_date - 400, 'Recent draft', 'pending', 'post_action_draft',
    'visible', 'public', 'draft'
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'recent', id from inserted;

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state,
    review_submitted_at
  ) values (
    'retention-fixture', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z',
    current_date - 400, 'Moderation pending', 'pending', 'post_action_draft',
    'visible', 'public', 'pending_review', timezone('utc', now())
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'moderation', id from inserted;

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state,
    published_at
  ) values (
    'retention-fixture', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z',
    current_date + 30, 'Future published', 'pending', 'pre_action',
    'visible', 'public', 'not_required', timezone('utc', now())
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'future', id from inserted;

insert into public.action_registrations(action_id, user_id, registration_status)
select action_id, 'retention-user', 'confirmed'
from retention_fixture_ids where fixture = 'future';

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state
  ) values (
    'retention-fixture', '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z',
    current_date - 400, 'Historical approved', 'approved', 'post_action_complete',
    'visible', 'public', 'not_required'
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'approved', id from inserted;

select is(
  (select outcome from public.purge_inactive_action_records(
    '2026-03-31T03:20:00Z', true, 20, null
  ) where action_id = (select action_id from retention_fixture_ids where fixture = 'abandoned')),
  'would_delete',
  'an old dependency-free draft is returned by dry-run'
);
select is(
  (select count(*) from public.purge_inactive_action_records('2026-03-31T03:20:00Z', true, 20, null)
   where outcome = 'would_delete'),
  1::bigint,
  'dry-run is bounded to the abandoned dependency-free row'
);
select is(
  (select outcome from public.purge_inactive_action_records(
    '2026-03-31T03:20:00Z', false, 20,
    array[(select action_id from retention_fixture_ids where fixture = 'abandoned')]
  ) where action_id = (select action_id from retention_fixture_ids where fixture = 'abandoned')),
  'deleted',
  'physical deletion requires and accepts the explicit dry-run id list'
);
select ok(
  not exists (select 1 from public.actions where id = (select action_id from retention_fixture_ids where fixture = 'abandoned')),
  'the abandoned row is physically removed only after revalidation'
);
select ok(
  exists (select 1 from public.actions where id = (select action_id from retention_fixture_ids where fixture = 'recent')),
  'a recently active draft is retained'
);
select ok(
  exists (select 1 from public.actions where id = (select action_id from retention_fixture_ids where fixture = 'moderation')),
  'an active moderation request is retained'
);
select ok(
  exists (select 1 from public.actions where id = (select action_id from retention_fixture_ids where fixture = 'future')),
  'a future published action with a registration is retained'
);
select ok(
  exists (select 1 from public.actions where id = (select action_id from retention_fixture_ids where fixture = 'approved')),
  'an approved historical action is never a retention candidate'
);

with inserted as (
  insert into public.actions (
    created_by_clerk_id, action_date, location_label, status, action_phase,
    moderation_visibility, access_mode, review_state, published_at,
    waste_kg, cigarette_butts, volunteers_count
  ) values (
    'statistical-version-fixture', current_date - 1, 'Versioned action',
    'approved', 'post_action_complete', 'visible', 'public', 'approved',
    timezone('utc', now()), 3, 20, 2
  ) returning id
)
insert into retention_fixture_ids(fixture, action_id)
select 'versioned', id from inserted;

select is(
  (select count(*) from public.action_statistical_versions where action_id = (select action_id from retention_fixture_ids where fixture = 'versioned')),
  1::bigint,
  'publication captures one authoritative statistical snapshot'
);

update public.actions
set status = 'pending', action_phase = 'post_action_draft', review_state = 'draft',
    published_at = null, waste_kg = 99, cigarette_butts = 999, volunteers_count = 1
where id = (select action_id from retention_fixture_ids where fixture = 'versioned');

select is(
  (select waste_kg from public.action_statistical_versions where action_id = (select action_id from retention_fixture_ids where fixture = 'versioned') and is_current),
  3::numeric,
  'a pending edit does not replace the approved quantity snapshot'
);
select is(
  (select volunteers_count from public.action_statistical_versions where action_id = (select action_id from retention_fixture_ids where fixture = 'versioned') and is_current),
  2,
  'a pending edit does not replace the approved participant count'
);

update public.actions
set status = 'approved', action_phase = 'post_action_complete', review_state = 'approved',
    published_at = timezone('utc', now()), waste_kg = 5, cigarette_butts = 30,
    volunteers_count = 3
where id = (select action_id from retention_fixture_ids where fixture = 'versioned');

select is(
  (select count(*) from public.action_statistical_versions where action_id = (select action_id from retention_fixture_ids where fixture = 'versioned')),
  2::bigint,
  'a newly approved and published version is captured atomically'
);
select is(
  (select volunteers_count from public.action_statistical_versions where action_id = (select action_id from retention_fixture_ids where fixture = 'versioned') and is_current),
  3,
  'the new published participant count is authoritative'
);

select ok(
  not exists (
    select 1 from public.action_statistical_versions
    where data_provenance = 'test'
  ),
  'test provenance never creates a statistical snapshot'
);

select * from finish();
rollback;
