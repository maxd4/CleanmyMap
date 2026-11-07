begin;

select plan(26);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"statistical-revocation-retention-test"}', true);

create temp table retention_state_before as
select waste_kg, participants_total
from public.public_impact_action_aggregate_state
where state_id = true;

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state,
    waste_kg, cigarette_butts, volunteers_count
  ) values (
    'statistical-revocation-retention-test', '2025-01-01T00:00:00Z',
    '2025-01-01T00:00:00Z', current_date - 400, 'Derived contribution only',
    'pending', 'post_action_draft', 'visible', 'public', 'draft', 9, 99, 3
  ) returning id
)
select id into temporary table retention_abandoned from inserted;

select ok(
  exists (
    select 1 from public.public_impact_action_contributions c
    where c.action_id = (select id from retention_abandoned)
  ),
  'an abandoned draft may have an automatically derived Impact row'
);
select ok(
  not (select eligible_non_temporal
       from public.public_impact_action_contributions
       where action_id = (select id from retention_abandoned)),
  'the derived Impact row is not an eligible statistical dependency'
);
select is(
  (select outcome from public.purge_inactive_action_records(
    '2026-03-31T03:20:00Z', true, 20, null
  ) where action_id = (select id from retention_abandoned)),
  'would_delete',
  'dry-run accepts an old draft with only a non-eligible derived projection'
);
select is(
  (select outcome from public.purge_inactive_action_records(
    '2026-03-31T03:20:00Z', false, 20,
    array[(select id from retention_abandoned)]
  ) where action_id = (select id from retention_abandoned)),
  'deleted',
  'physical deletion accepts only the explicit dry-run candidate'
);
select ok(
  not exists (select 1 from public.actions where id = (select id from retention_abandoned)),
  'the abandoned action is removed after dependency revalidation'
);
select ok(
  not exists (
    select 1 from public.public_impact_action_contributions
    where action_id = (select id from retention_abandoned)
  ),
  'the action delete trigger removes its derived Impact projection'
);
select is(
  (select waste_kg from public.public_impact_action_aggregate_state where state_id = true),
  (select waste_kg from retention_state_before),
  'deleting a non-eligible projection does not change the Impact waste counter'
);
select is(
  (select participants_total from public.public_impact_action_aggregate_state where state_id = true),
  (select participants_total from retention_state_before),
  'deleting a non-eligible projection does not change the Impact participant counter'
);

with inserted as (
  insert into public.actions (
    created_by_clerk_id, created_at, updated_at, action_date, location_label,
    status, action_phase, moderation_visibility, access_mode, review_state
  ) values (
    'statistical-revocation-retention-test', '2025-01-01T00:00:00Z',
    '2025-01-01T00:00:00Z', current_date - 400, 'Business dependency',
    'pending', 'post_action_draft', 'visible', 'public', 'draft'
  ) returning id
)
select id into temporary table retention_business_dependency from inserted;

insert into public.action_registrations(action_id, user_id, registration_status)
values ((select id from retention_business_dependency), 'retention-business-user', 'confirmed');

select is(
  (select outcome from public.purge_inactive_action_records(
    '2026-03-31T03:20:00Z', true, 20, null
  ) where action_id = (select id from retention_business_dependency)),
  'blocked',
  'a real registration dependency still blocks the purge'
);
select ok(
  exists (select 1 from public.actions where id = (select id from retention_business_dependency)),
  'a blocked action is preserved'
);
select ok(
  exists (select 1 from public.action_registrations
          where action_id = (select id from retention_business_dependency)),
  'a blocked business dependency is preserved'
);

create temp table reference_before as
select waste_per_volunteer, butts_per_volunteer,
  waste_source_count, butts_source_count, eligible_action_count
from public.action_collection_reference_averages_v1();
create temp table context_reference_before as
select action_context, waste_source_count, butts_source_count, eligible_action_count
from public.action_collection_context_reference_averages_v1(current_date)
where action_context = 'citizen';

with inserted as (
  insert into public.actions (
    created_by_clerk_id, action_date, location_label, status, action_phase,
    moderation_visibility, access_mode, review_state, published_at,
    data_provenance, action_context, waste_kg, cigarette_butts,
    volunteers_count, children_count, adult_count, retired_count,
    duration_minutes
  ) values (
    'statistical-revocation-retention-test', current_date - 1,
    'Current eligibility boundary', 'approved', 'post_action_complete',
    'visible', 'public', 'approved', timezone('utc', now()), 'real', 'citizen',
    20, 100, 10, 2, 7, 1, 30
  ) returning id
)
select id into temporary table reference_action from inserted;

select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count + 1 from reference_before),
  'a current visible action is included from its published snapshot'
);
select is(
  (select butts_source_count from public.action_collection_reference_averages_v1()),
  (select butts_source_count + 1 from reference_before),
  'the cigarette-butt reference includes the published snapshot once'
);
select is(
  (select waste_source_count from public.action_collection_context_reference_averages_v1(current_date)
   where action_context = 'citizen'),
  (select coalesce(waste_source_count, 0) + 1 from context_reference_before),
  'the dated context reference includes the published snapshot'
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = (select id from reference_action)),
  1::bigint,
  'the visible action has one authoritative snapshot'
);

update public.actions
set moderation_visibility = 'hidden'
where id = (select id from reference_action);

select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count from reference_before),
  'a hidden action is immediately excluded while its snapshot remains'
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = (select id from reference_action)),
  1::bigint,
  'revocation does not delete or replace the historical snapshot'
);

update public.actions
set moderation_visibility = 'visible'
where id = (select id from reference_action);

select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count + 1 from reference_before),
  'rehabilitation restores the reference without a new snapshot'
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = (select id from reference_action)),
  1::bigint,
  'rehabilitation is not a statistical revision'
);

update public.actions
set access_mode = 'invite_link'
where id = (select id from reference_action);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count from reference_before),
  'an invite-link action is excluded from public references'
);

update public.actions
set access_mode = 'public', status = 'pending', action_phase = 'post_action_draft',
    review_state = 'draft', published_at = null, waste_kg = 999,
    cigarette_butts = 9999, volunteers_count = 1,
    children_count = null, adult_count = null, retired_count = null,
    duration_minutes = 999
where id = (select id from reference_action);

select is(
  (select waste_kg from public.action_statistical_versions
   where action_id = (select id from reference_action) and is_current),
  20::numeric,
  'a pending correction keeps the previously published quantity'
);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count + 1 from reference_before),
  'a pending correction keeps the old snapshot in the public reference'
);

update public.actions
set status = 'rejected', action_phase = 'post_action_complete', review_state = 'rejected'
where id = (select id from reference_action);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count from reference_before),
  'a rejected action is excluded without deleting its snapshot'
);

update public.actions
set status = 'approved', action_phase = 'post_action_complete', review_state = 'approved',
    moderation_visibility = 'visible', access_mode = 'public',
    published_at = timezone('utc', now()), data_provenance = 'real',
    action_context = 'citizen', waste_kg = 20, cigarette_butts = 100,
    volunteers_count = 10, children_count = 2, adult_count = 7,
    retired_count = 1, duration_minutes = 30
where id = (select id from reference_action);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count + 1 from reference_before),
  'an approved action can be rehabilitated from the existing snapshot'
);

update public.actions
set status = 'cancelled', cancelled_at = timezone('utc', now()),
    cancelled_by_clerk_id = 'retention-test-admin',
    cancellation_reason = 'other', cancelled_from_status = 'approved'
where id = (select id from reference_action);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  (select waste_source_count from reference_before),
  'a cancelled action is excluded from public references'
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = (select id from reference_action)),
  1::bigint,
  'revocation states preserve the complete snapshot history'
);

select * from finish();
rollback;
