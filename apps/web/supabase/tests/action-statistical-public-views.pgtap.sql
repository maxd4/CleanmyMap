begin;

select plan(30);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"statistical-public-views-test"}', true);

select ok(
  not has_table_privilege('anon', 'public.action_map_statistical_source', 'select'),
  'anon has no direct SELECT privilege on the map statistical view'
);
select ok(
  not has_table_privilege('authenticated', 'public.action_map_statistical_source', 'select'),
  'authenticated has no direct SELECT privilege on the map statistical view'
);
select ok(
  not has_table_privilege('anon', 'public.action_pollution_score_reference_population', 'select'),
  'anon has no direct SELECT privilege on the pollution reference view'
);
select ok(
  not has_table_privilege('authenticated', 'public.action_pollution_score_reference_population', 'select'),
  'authenticated has no direct SELECT privilege on the pollution reference view'
);

create temp table pollution_reference_before as
select scope, waste_source_count, butts_source_count, eligible_action_count
from public.action_pollution_score_references_v2();

insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, department_code,
  department_name, status, action_phase, moderation_visibility, access_mode,
  review_state, published_at, data_provenance, action_context,
  waste_kg, cigarette_butts, volunteers_count, children_count, adult_count,
  retired_count, duration_minutes, latitude, longitude
) values (
  '00000000-0000-0000-0000-000000000705', 'statistical-public-views-test',
  current_date - 1, 'Public statistical view', '75', 'Paris', 'approved',
  'post_action_complete', 'visible', 'public', 'approved',
  timezone('utc', now()), 'real', 'citizen', 20, 100, 10, 2, 7, 1, 30,
  48.8566, 2.3522
);

select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000705'),
  1::bigint,
  'the public action owns one validated statistical snapshot'
);

set local role anon;
select throws_ok(
  $$select action_id from public.action_map_statistical_source limit 1$$,
  '42501', null,
  'anon cannot read the map statistical view directly'
);
select throws_ok(
  $$select scope from public.action_pollution_score_reference_population limit 1$$,
  '42501', null,
  'anon cannot read the pollution reference view directly'
);
select throws_ok(
  $$select action_id from public.action_statistical_versions limit 1$$,
  '42501', null,
  'anon cannot read raw statistical snapshots'
);
select ok(
  exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'anon can use the filtered map RPC for the public action'
);
select ok(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global') >
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'anon can use the filtered pollution reference RPC'
);
select throws_ok(
  $$select action_id from public.action_map_statistical_source limit 1$$,
  '42501', null,
  'the map view remains closed after its public RPC is used'
);

set local role authenticated;
select throws_ok(
  $$select action_id from public.action_map_statistical_source limit 1$$,
  '42501', null,
  'authenticated cannot read the map statistical view directly'
);
select throws_ok(
  $$select scope from public.action_pollution_score_reference_population limit 1$$,
  '42501', null,
  'authenticated cannot read the pollution reference view directly'
);
select throws_ok(
  $$select action_id from public.action_statistical_versions limit 1$$,
  '42501', null,
  'authenticated cannot read raw statistical snapshots'
);
select ok(
  exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'authenticated can use the filtered map RPC'
);

set local role service_role;
update public.actions
set moderation_visibility = 'hidden'
where id = '00000000-0000-0000-0000-000000000705';

set local role anon;
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'hidden actions are excluded from the map RPC'
);
select is(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global'),
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'hidden actions are excluded from pollution references without deleting snapshots'
);

set local role service_role;
update public.actions
set moderation_visibility = 'visible', access_mode = 'invite_link'
where id = '00000000-0000-0000-0000-000000000705';
set local role anon;
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'invite-link actions are excluded from the map RPC'
);
select is(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global'),
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'invite-link actions are excluded from pollution references'
);

set local role service_role;
update public.actions
set access_mode = 'public', status = 'rejected', review_state = 'rejected'
where id = '00000000-0000-0000-0000-000000000705';
set local role anon;
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'rejected actions are excluded from the map RPC'
);
select is(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global'),
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'rejected actions are excluded from pollution references'
);

set local role service_role;
update public.actions
set status = 'cancelled', review_state = 'approved'
where id = '00000000-0000-0000-0000-000000000705';
set local role anon;
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'cancelled actions are excluded from the map RPC'
);

set local role service_role;
update public.actions
set status = 'pending', action_phase = 'post_action_draft', review_state = 'draft',
    published_at = null, waste_kg = 999, cigarette_butts = 9999,
    volunteers_count = 1, children_count = null, adult_count = null,
    retired_count = null, duration_minutes = 999,
    moderation_visibility = 'visible', access_mode = 'public'
where id = '00000000-0000-0000-0000-000000000705';
set local role anon;
select is(
  (select waste_kg from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000705' and is_current),
  20::numeric,
  'a pending edit leaves the published snapshot quantity unchanged'
);
select is(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global'),
  (select eligible_action_count from pollution_reference_before where scope = 'global') + 1,
  'a pending edit keeps the previous published measurement in references'
);

set local role service_role;
update public.actions
set status = 'approved', action_phase = 'post_action_complete', review_state = 'approved',
    published_at = timezone('utc', now()), data_provenance = 'real',
    action_context = 'citizen', waste_kg = 20, cigarette_butts = 100,
    volunteers_count = 10, children_count = 2, adult_count = 7,
    retired_count = 1, duration_minutes = 30
where id = '00000000-0000-0000-0000-000000000705';
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000705'),
  1::bigint,
  'rehabilitation with the same published payload does not create a snapshot'
);

set local role anon;
select ok(
  exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'the rehabilitated action returns to the filtered map RPC'
);
select ok(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global') >
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'the rehabilitated action returns to pollution references'
);

set local role service_role;
update public.actions
set data_provenance = 'test'
where id = '00000000-0000-0000-0000-000000000705';
set local role anon;
select ok(
  not exists (
    select 1 from public.actions_map_feed(
      null, null, null, null, 12, null, null, array['action'], null, 80
    ) where id = '00000000-0000-0000-0000-000000000705'
  ),
  'test provenance is excluded from the map RPC even after publication'
);
select is(
  (select eligible_action_count from public.action_pollution_score_references_v2()
   where scope = 'global'),
  (select eligible_action_count from pollution_reference_before where scope = 'global'),
  'test provenance is excluded from pollution references'
);
select is(
  (select count(*) from public.action_statistical_versions
   where action_id = '00000000-0000-0000-0000-000000000705'),
  1::bigint,
  'revocation preserves the authoritative snapshot and its historical values'
);

select * from finish();
rollback;
