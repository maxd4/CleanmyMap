begin;

select plan(21);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"public-impact-temporal-test"}', true);

create temp table public_impact_temporal_state_before as
select visible_actions, waste_kg, cigarette_butts, participants_total,
  total_duration_minutes
from public.public_impact_action_aggregate_state
where state_id = true;

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, waste_kg,
  cigarette_butts, volunteers_count, duration_minutes, status,
  action_phase, moderation_visibility, published_at, data_provenance
) values (
  '00000000-0000-0000-0000-000000000201', 'pgtap-temporal', current_date + 1,
  'Temporal future', 9, 90, 3, 30, 'approved', 'post_action_complete',
  'visible', timezone('utc', now()), 'real'
);

select is(
  (select eligible_non_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000201'),
  true,
  'a future approved snapshot remains permanently eligible'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000201'),
  false,
  'a future contribution is stored but outside the current window'
);
select is(
  (select visible_actions from public.public_impact_action_aggregate_state where state_id = true)
    - (select visible_actions from public_impact_temporal_state_before),
  0::bigint,
  'a future contribution does not change the public aggregate'
);

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, waste_kg,
  cigarette_butts, volunteers_count, duration_minutes, status,
  action_phase, moderation_visibility, published_at, data_provenance
) values (
  '00000000-0000-0000-0000-000000000202', 'pgtap-temporal', current_date,
  'Temporal admissible', 4, 40, 2, 20, 'approved', 'post_action_complete',
  'visible', timezone('utc', now()), 'real'
);

select is(
  (select eligible_non_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000202'),
  true,
  'an action dated today is permanently eligible'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000202'),
  true,
  'an action is counted exactly from its admissible date'
);
select is(
  (select visible_actions from public.public_impact_action_aggregate_state where state_id = true)
    - (select visible_actions from public_impact_temporal_state_before),
  1::bigint,
  'the admissible action changes the aggregate once'
);

select lives_ok(
  $$select public.advance_public_impact_action_state(
    current_date, public.current_public_impact_projection_version()
  )$$,
  'advancing to the current floor is executable'
);

create temp table public_impact_temporal_state_after_first_advance as
select visible_actions, waste_kg, cigarette_butts, participants_total,
  total_duration_minutes
from public.public_impact_action_aggregate_state
where state_id = true;

select lives_ok(
  $$select public.advance_public_impact_action_state(
    current_date, public.current_public_impact_projection_version()
  )$$,
  'repeating the same advance is executable'
);
select is(
  (select count(*)::bigint from (
    select visible_actions, waste_kg, cigarette_butts, participants_total,
      total_duration_minutes from public_impact_temporal_state_after_first_advance
    except
    select visible_actions, waste_kg, cigarette_butts, participants_total,
      total_duration_minutes from public.public_impact_action_aggregate_state
    where state_id = true
  ) differences),
  0::bigint,
  'repeated advancement does not double-count the admissible action'
);

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, waste_kg,
  cigarette_butts, volunteers_count, duration_minutes, status,
  action_phase, moderation_visibility, published_at, data_provenance,
  access_mode
) values
  (
    '00000000-0000-0000-0000-000000000203', 'pgtap-temporal', current_date - 2,
    'Temporal expiring', 3, 30, 1, 10, 'approved', 'post_action_complete',
    'visible', timezone('utc', now()), 'real', 'public'
  ),
  (
    '00000000-0000-0000-0000-000000000204', 'pgtap-temporal', current_date,
    'Temporal private', 3, 30, 1, 10, 'approved', 'post_action_complete',
    'visible', timezone('utc', now()), 'real', 'invite_link'
  ),
  (
    '00000000-0000-0000-0000-000000000205', 'pgtap-temporal', current_date,
    'Temporal hidden', 3, 30, 1, 10, 'approved', 'post_action_complete',
    'hidden', timezone('utc', now()), 'real', 'public'
  ),
  (
    '00000000-0000-0000-0000-000000000206', 'pgtap-temporal', current_date,
    'Temporal rejected', 3, 30, 1, 10, 'rejected', 'post_action_complete',
    'visible', timezone('utc', now()), 'real', 'public'
  ),
  (
    '00000000-0000-0000-0000-000000000207', 'pgtap-temporal', current_date,
    'Temporal test provenance', 3, 30, 1, 10, 'approved', 'post_action_complete',
    'visible', timezone('utc', now()), 'test', 'public'
  );

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    current_date - 7, public.current_public_impact_projection_version()
  )$$,
  'reconstruction remains executable with future and excluded actions'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000202'),
  true,
  'reconstruction activates the action inside the window'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000201'),
  false,
  'reconstruction keeps the future action outside the window'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000203'),
  true,
  'reconstruction activates an older action before floor advancement'
);
select is(
  (select count(*)::bigint
   from public.public_impact_action_contributions
   where action_id in (
     '00000000-0000-0000-0000-000000000204',
     '00000000-0000-0000-0000-000000000205',
     '00000000-0000-0000-0000-000000000206',
     '00000000-0000-0000-0000-000000000207'
   ) and not eligible_non_temporal and not eligible_temporal),
  4::bigint,
  'private, hidden, rejected and test actions are permanently excluded'
);

select lives_ok(
  $$select public.advance_public_impact_action_state(
    current_date - 1, public.current_public_impact_projection_version()
  )$$,
  'advancing the floor expires actions below the floor'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000203'),
  false,
  'the action below the floor is no longer active'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000202'),
  true,
  'the action at the new floor remains active'
);
select lives_ok(
  $$select public.advance_public_impact_action_state(
    current_date - 1, public.current_public_impact_projection_version()
  )$$,
  'repeating floor advancement remains executable'
);
select is(
  (select eligible_temporal from public.public_impact_action_contributions
   where action_id = '00000000-0000-0000-0000-000000000201'),
  false,
  'the future action remains excluded after later advances'
);

create temp table public_impact_temporal_state_before_parity_rebuild as
select visible_actions, waste_kg, cigarette_butts, participants_total,
  total_duration_minutes
from public.public_impact_action_aggregate_state
where state_id = true;

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    current_date - 1, public.current_public_impact_projection_version()
  )$$,
  'reconstruction at the same floor remains executable'
);
select is(
  (select count(*)::bigint from (
    select visible_actions, waste_kg, cigarette_butts, participants_total,
      total_duration_minutes from public_impact_temporal_state_before_parity_rebuild
    except
    select visible_actions, waste_kg, cigarette_butts, participants_total,
      total_duration_minutes from public.public_impact_action_aggregate_state
    where state_id = true
  ) differences),
  0::bigint,
  'reconstruction and incremental advancement have the same aggregate state'
);

select * from finish();
rollback;
