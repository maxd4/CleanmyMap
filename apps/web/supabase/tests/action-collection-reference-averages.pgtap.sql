begin;

select plan(20);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"collection-reference-test"}', true);

-- Five eligible rows reproduce the anonymized Supabase observation from
-- 2026-11-06. The following rows exercise the canonical exclusions.
insert into public.actions (
  created_by_clerk_id,
  action_date,
  location_label,
  status,
  action_phase,
  moderation_visibility,
  published_at,
  waste_kg,
  cigarette_butts,
  volunteers_count
) values
  ('collection-reference-fixture', current_date - 1, 'Reference eligible 01', 'approved', 'post_action_complete', 'visible', timezone('utc', now()), null, 3750, 15),
  ('collection-reference-fixture', current_date - 1, 'Reference eligible 02', 'approved', 'post_action_complete', 'visible', timezone('utc', now()), null, 750, 10),
  ('collection-reference-fixture', current_date - 1, 'Reference eligible 03', 'approved', 'post_action_complete', 'visible', timezone('utc', now()), 20, 6250, 20),
  ('collection-reference-fixture', current_date - 1, 'Reference eligible 04', 'approved', 'post_action_complete', 'visible', timezone('utc', now()), null, 1875, 10),
  ('collection-reference-fixture', current_date - 1, 'Reference eligible 05', 'approved', 'post_action_complete', 'visible', timezone('utc', now()), 20, 1250, 10);

select is(
  (select waste_per_volunteer from public.action_collection_reference_averages_v1()),
  1.5::numeric,
  'RPC computes the arithmetic mean of the two waste ratios'
);
select is(
  (select butts_per_volunteer from public.action_collection_reference_averages_v1()),
  190::numeric,
  'RPC computes the arithmetic mean of the five cigarette-butt ratios'
);
select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  2,
  'RPC keeps the waste source count independent'
);
select is(
  (select butts_source_count from public.action_collection_reference_averages_v1()),
  5,
  'RPC keeps the cigarette-butt source count independent'
);
select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  5,
  'RPC excludes pending, future, private, rejected and measurement-less actions'
);
select is(
  (select count(*)::integer from public.actions where created_by_clerk_id = 'collection-reference-fixture'),
  5,
  'the base fixture contains the five eligible rows before exclusions are added'
);

-- Test data is explicitly marked at the fixture boundary. Its approved status,
-- public visibility and historical date must not make it statistical evidence.
insert into public.actions (
  created_by_clerk_id, action_date, location_label, status, action_phase,
  moderation_visibility, access_mode, data_provenance, waste_kg,
  cigarette_butts, volunteers_count
) values
  ('collection-reference-fixture', current_date - 1, 'Codex approved test fixture',
   'approved', 'post_action_complete', 'visible', 'public', 'test', 999, 999, 1),
  ('collection-reference-fixture', current_date - 1, 'User draft fixture',
   'pending', 'post_action_draft', 'visible', 'public', 'unknown', 999, 999, 1);

select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  5,
  'approved test data and a user draft remain excluded from statistics'
);
select is(
  (select waste_per_volunteer from public.action_collection_reference_averages_v1()),
  1.5::numeric,
  'an approved test fixture cannot alter the historical waste average'
);
select is(
  (select butts_per_volunteer from public.action_collection_reference_averages_v1()),
  190::numeric,
  'an approved test fixture cannot alter the historical cigarette-butt average'
);
select is(
  (select waste_per_volunteer from public.action_collection_reference_averages_v1()),
  (20::numeric / 20 + 20::numeric / 10) / 2,
  'waste uses a per-action average rather than a ratio of totals'
);
select is(
  (select butts_per_volunteer from public.action_collection_reference_averages_v1()),
  (3750::numeric / 15 + 750::numeric / 10 + 6250::numeric / 20 + 1875::numeric / 10 + 1250::numeric / 10) / 5,
  'cigarette butts use a per-action average rather than a ratio of totals'
);
select ok(
  (select (40::numeric / 30) <> waste_per_volunteer
     from public.action_collection_reference_averages_v1()),
  'the waste ratio of source totals differs from the RPC average'
);
select ok(
  (select (13875::numeric / 65) <> butts_per_volunteer
     from public.action_collection_reference_averages_v1()),
  'the cigarette-butt ratio of source totals differs from the RPC average'
);

-- A finalized invite-link action remains private even when it is visible to its
-- invited audience. It must not enter the public aggregate population.
insert into public.actions (
  created_by_clerk_id,
  action_date,
  location_label,
  status,
  action_phase,
  moderation_visibility,
  access_mode,
  waste_kg,
  cigarette_butts,
  volunteers_count
) values (
  'collection-reference-fixture', current_date - 1, 'Reference invite-link private',
  'approved', 'post_action_complete', 'visible', 'invite_link', 20, 100, 10
);

select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  5,
  'invite-link actions are excluded independently of moderation visibility'
);

insert into public.actions (
  created_by_clerk_id,
  action_date,
  location_label,
  status,
  action_phase,
  moderation_visibility,
  waste_kg,
  cigarette_butts,
  volunteers_count
) values (
  'collection-reference-fixture', current_date - 1, 'Reference public hidden',
  'approved', 'post_action_complete', 'hidden', 20, 100, 10
);

select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  5,
  'public actions hidden by moderation remain excluded'
);

insert into public.actions (
  created_by_clerk_id,
  action_date,
  location_label,
  status,
  action_phase,
  moderation_visibility,
  waste_kg,
  cigarette_butts,
  volunteers_count
) values
  ('collection-reference-fixture', current_date - 1, 'Reference pending', 'pending', 'post_action_complete', 'visible', 20, 100, 10),
  ('collection-reference-fixture', current_date + 1, 'Reference future', 'approved', 'post_action_complete', 'visible', 20, 100, 10),
  ('collection-reference-fixture', current_date - 1, 'Reference rejected', 'rejected', 'post_action_complete', 'visible', 20, 100, 10),
  ('collection-reference-fixture', current_date - 1, 'Reference without measurements', 'approved', 'post_action_complete', 'visible', null, null, 10);

select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  5,
  'pending, future, rejected and measurement-less actions remain excluded'
);

select is(
  (select count(*)::integer from public.actions where created_by_clerk_id = 'collection-reference-fixture'),
  11,
  'the fixture contains five eligible and six excluded rows'
);

insert into public.actions (
  created_by_clerk_id,
  action_date,
  location_label,
  status,
  action_phase,
  moderation_visibility,
  published_at,
  waste_kg,
  cigarette_butts,
  volunteers_count
) values (
  'collection-reference-fixture', current_date - 1, 'Reference explicit zero',
  'approved', 'post_action_complete', 'visible', timezone('utc', now()), 0, 0, 10
);

select is(
  (select waste_source_count from public.action_collection_reference_averages_v1()),
  3,
  'an explicit zero remains a valid waste source'
);
select is(
  (select butts_source_count from public.action_collection_reference_averages_v1()),
  6,
  'an explicit zero remains a valid cigarette-butt source'
);
select is(
  (select eligible_action_count from public.action_collection_reference_averages_v1()),
  6,
  'the explicit zero action is eligible without changing the NULL exclusion'
);

select * from finish();
rollback;
