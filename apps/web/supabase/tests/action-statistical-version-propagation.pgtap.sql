begin;

select plan(34);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"statistical-version-propagation-test"}', true);

create temp table propagation_state_before as
select waste_kg, participants_total
from public.public_impact_action_aggregate_state
where state_id = true;

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, department_code,
  department_name, status, action_phase, moderation_visibility, access_mode,
  review_state, published_at, data_provenance, action_context,
  waste_kg, cigarette_butts, volunteers_count, children_count, adult_count,
  retired_count, duration_minutes
) values (
  '00000000-0000-0000-0000-000000000301', 'statistical-version-propagation',
  current_date - 1, 'Version propagation', '75', 'Paris', 'approved',
  'post_action_complete', 'visible', 'public', 'approved',
  timezone('utc', now()), 'real', 'citizen', 20, 100, 10, 2, 7, 1, 30
);

select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  1::bigint,
  'the first approved publication creates one statistical version'
);
select is(
  (select volunteers_count from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301' and is_current),
  10,
  'the first snapshot owns the declared participant count'
);
select is(
  (select waste_kg from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  20::numeric,
  'the incremental contribution uses the published form quantity'
);
select is(
  (select count(*) from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'),
  1::bigint,
  'the first source version has one idempotent application audit row'
);

update public.actions
set status = 'pending', action_phase = 'post_action_draft', review_state = 'draft',
    published_at = null, waste_kg = 999, cigarette_butts = 9999,
    volunteers_count = 1, children_count = null, adult_count = null,
    retired_count = null, duration_minutes = 999, action_context = 'school'
where id = '00000000-0000-0000-0000-000000000301';

select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  1::bigint,
  'a pending correction does not create a statistical version'
);
select is(
  (select waste_kg from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  20::numeric,
  'a pending correction cannot replace the contribution payload'
);
select is(
  (select eligible_non_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  true,
  'a pending correction keeps the previous published contribution active'
);

update public.actions
set status = 'approved', action_phase = 'post_action_complete', review_state = 'approved',
    published_at = timezone('utc', now()), data_provenance = 'real',
    action_context = 'citizen', waste_kg = 24, cigarette_butts = 120,
    volunteers_count = 12, children_count = 3, adult_count = 8,
    retired_count = 1, duration_minutes = 45
where id = '00000000-0000-0000-0000-000000000301';

select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  2::bigint,
  'a newly approved publication appends one source version'
);
select is(
  (select volunteers_count from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301' and is_current),
  12,
  'the new published participant count is authoritative'
);
select is(
  (select waste_kg from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  24::numeric,
  'the old contribution is replaced by the complete new payload'
);
select is(
  (select (changed_fields->'participants'->>'to')::integer
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  12,
  'participant deltas are recorded against the new source revision'
);
select ok(
  (select changed_fields ? 'waste_kg'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'waste changes are recorded in the application audit'
);
select is(
  (select waste_kg from public.public_impact_action_aggregate_state where state_id = true)
    - (select waste_kg from propagation_state_before),
  24::numeric,
  'the aggregate contains the new quantity exactly once'
);
select is(
  (select participants_total from public.public_impact_action_aggregate_state where state_id = true)
    - (select participants_total from propagation_state_before),
  12::bigint,
  'the aggregate contains the new participant count exactly once'
);

update public.actions
set status = 'approved', action_phase = 'post_action_complete', review_state = 'approved',
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current),
    data_provenance = 'real', action_context = 'citizen', waste_kg = 24,
    cigarette_butts = 120, volunteers_count = 12, children_count = 3,
    adult_count = 8, retired_count = 1, duration_minutes = 45
where id = '00000000-0000-0000-0000-000000000301';

select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  2::bigint,
  'replaying the same published payload does not create a duplicate version'
);
select is(
  (select count(*) from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'),
  2::bigint,
  'replaying the same source version does not duplicate its audit application'
);

update public.actions
set children_count = 4, adult_count = 7, retired_count = 1,
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current)
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  3::bigint,
  'a composition change creates a new version'
);
select ok(
  (select changed_fields ? 'composition'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'composition changes are auditable'
);

update public.actions
set waste_kg = 26,
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current)
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  4::bigint,
  'a waste change creates a new version'
);
select ok(
  (select changed_fields ? 'waste_kg'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'waste changes remain auditable after successive publications'
);

update public.actions
set cigarette_butts = 140,
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current)
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  5::bigint,
  'a cigarette-butt change creates a new version'
);
select ok(
  (select changed_fields ? 'cigarette_butts'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'cigarette-butt changes remain auditable'
);

update public.actions
set duration_minutes = 60,
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current)
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  6::bigint,
  'a duration change creates a new version'
);
select ok(
  (select changed_fields ? 'duration_minutes'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'duration changes remain auditable'
);

update public.actions
set action_context = 'company',
    published_at = (select published_at from public.action_statistical_versions
                    where action_id = '00000000-0000-0000-0000-000000000301' and is_current)
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  7::bigint,
  'a context change creates a new version'
);
select ok(
  (select changed_fields ? 'context'
   from public.public_impact_action_contribution_applications
   where action_id = '00000000-0000-0000-0000-000000000301'
   order by (select version_number from public.action_statistical_versions v
             where v.id = source_version_id) desc limit 1),
  'context changes remain auditable'
);

update public.actions
set status = 'pending', action_phase = 'post_action_draft', review_state = 'draft',
    published_at = null, waste_kg = 999
where id = '00000000-0000-0000-0000-000000000301';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  7::bigint,
  'a pending correction leaves the last published version current'
);
update public.actions
set status = 'rejected', action_phase = 'post_action_complete', review_state = 'rejected',
    published_at = null
where id = '00000000-0000-0000-0000-000000000301';
select ok(
  (select not eligible_non_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000301'),
  'cancellation removes the action from the aggregate without deleting history'
);

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, status, action_phase,
  moderation_visibility, access_mode, review_state, published_at,
  data_provenance, waste_kg, cigarette_butts, volunteers_count, latitude, longitude
) values (
  '00000000-0000-0000-0000-000000000302', 'statistical-version-propagation',
  current_date - 1, 'Codex test action', 'approved', 'post_action_complete',
  'visible', 'public', 'approved', timezone('utc', now()), 'test', 100, 1000, 10,
  48.8566, 2.3522
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000302'),
  0::bigint,
  'test provenance never creates an authoritative statistical version'
);
select ok(
  (select not eligible_non_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000302'),
  'test provenance never enters the public aggregate'
);
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000302'
  ),
  'test provenance never enters the public map'
);

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    (select floor_date from public.public_impact_action_aggregate_state where state_id = true),
    public.current_public_impact_projection_version()
  )$$,
  'a complete rebuild remains executable after successive source revisions'
);
select is(
  (select waste_kg from public.public_impact_action_aggregate_state where state_id = true)
    - (select coalesce(sum(waste_kg), 0::numeric)
       from public.public_impact_action_contributions
       where eligible_temporal),
  0::numeric,
  'the rebuilt waste aggregate equals the sum of current temporal contributions'
);
select is(
  (select participants_total from public.public_impact_action_aggregate_state where state_id = true)
    - (select coalesce(sum(participants_total), 0::bigint)
       from public.public_impact_action_contributions
       where eligible_temporal),
  0::bigint,
  'the rebuilt participant aggregate equals the sum of current temporal contributions'
);

select * from finish();
rollback;
