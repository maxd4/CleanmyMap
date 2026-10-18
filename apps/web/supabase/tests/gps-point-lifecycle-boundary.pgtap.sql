begin;

select plan(20);

select ok(
  not has_table_privilege('anon', 'public.gps_points', 'INSERT'),
  'anon cannot insert GPS points'
);
select ok(
  has_table_privilege('authenticated', 'public.gps_points', 'INSERT'),
  'authenticated retains the mobile GPS insert capability'
);
select ok(
  has_table_privilege('service_role', 'public.gps_points', 'INSERT'),
  'service_role retains server GPS writes'
);
select ok(
  has_function_privilege('authenticated', 'public.guard_gps_point_mission_tracking()', 'EXECUTE'),
  'authenticated can execute the trigger function during an insert'
);

create temp table gps_point_lifecycle_fixture (
  tracking_id uuid not null,
  completed_id uuid not null,
  cancelled_id uuid not null,
  other_tracking_id uuid not null
);
grant select on gps_point_lifecycle_fixture to anon, authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);

insert into public.profiles (id, display_name)
values ('gps-owner-a', 'GPS owner A'), ('gps-owner-b', 'GPS owner B')
on conflict (id) do nothing;

insert into public.missions (volunteer_id, label, status, started_at)
values
  ('gps-owner-a', 'GPS lifecycle tracking A', 'tracking', now()),
  ('gps-owner-a', 'GPS lifecycle completed A', 'completed', now() - interval '1 hour'),
  ('gps-owner-a', 'GPS lifecycle cancelled A', 'cancelled', now() - interval '1 hour'),
  ('gps-owner-b', 'GPS lifecycle tracking B', 'tracking', now());

delete from gps_point_lifecycle_fixture;
insert into gps_point_lifecycle_fixture
select
  (select id from public.missions where label = 'GPS lifecycle tracking A' order by created_at desc limit 1),
  (select id from public.missions where label = 'GPS lifecycle completed A' order by created_at desc limit 1),
  (select id from public.missions where label = 'GPS lifecycle cancelled A' order by created_at desc limit 1),
  (select id from public.missions where label = 'GPS lifecycle tracking B' order by created_at desc limit 1);

insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
select tracking_id, 48.8566, 2.3522, now() - interval '2 minutes', 'gps-a-1'
from gps_point_lifecycle_fixture;
insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
select tracking_id, 48.8576, 2.3532, now() - interval '1 minute', 'gps-a-2'
from gps_point_lifecycle_fixture;
insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
select other_tracking_id, 48.8566, 2.3522, now(), 'gps-b-1'
from gps_point_lifecycle_fixture;

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"gps-owner-a"}', true);
select lives_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select tracking_id, 48.8586, 2.3542, now(), 'gps-a-3'
    from gps_point_lifecycle_fixture$$,
  'owner A can insert a point into a tracking mission'
);
select is(
  (select count(*)::integer from public.gps_points where mission_id = (select tracking_id from gps_point_lifecycle_fixture)),
  3,
  'owner A sees the tracking mission points'
);
select lives_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select tracking_id, 48.8566, 2.3522, now(), 'gps-a-1'
    from gps_point_lifecycle_fixture
    on conflict (mission_id, client_point_id) do nothing$$,
  'retrying a client point remains idempotent'
);
select is(
  (select count(*)::integer from public.gps_points where mission_id = (select tracking_id from gps_point_lifecycle_fixture)),
  3,
  'the idempotent GPS retry does not duplicate a point'
);
select lives_ok(
  $$update public.missions set status = 'completed', ended_at = now()
    where id = (select tracking_id from gps_point_lifecycle_fixture)$$,
  'owner A can finalize a tracking mission'
);
select ok(
  (select distance_m from public.missions where id = (select tracking_id from gps_point_lifecycle_fixture)) > 0,
  'finalization retains server-computed distance metrics'
);
select lives_ok(
  $$update public.missions set status = 'tracking' where id = (select completed_id from gps_point_lifecycle_fixture)$$,
  'a completed mission update is filtered without exposing an error'
);
select is(
  (select status from public.missions where id = (select completed_id from gps_point_lifecycle_fixture)),
  'completed',
  'a completed mission cannot be reopened by the mobile owner'
);
select throws_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select completed_id, 48.8566, 2.3522, now(), 'gps-completed-1'
    from gps_point_lifecycle_fixture$$,
  '42501', null,
  'completed missions reject new GPS points'
);
select throws_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select cancelled_id, 48.8566, 2.3522, now(), 'gps-cancelled-1'
    from gps_point_lifecycle_fixture$$,
  '42501', null,
  'cancelled missions reject new GPS points'
);
select is(
  (select count(*)::integer from public.gps_points where mission_id = (select completed_id from gps_point_lifecycle_fixture)),
  0,
  'a rejected completed insert adds no row'
);
select is(
  (select count(*)::integer from public.gps_points where mission_id = (select cancelled_id from gps_point_lifecycle_fixture)),
  0,
  'a rejected cancelled insert adds no row'
);
select is(
  (select count(*)::integer from public.gps_points where mission_id = (select other_tracking_id from gps_point_lifecycle_fixture)),
  0,
  'owner A cannot read owner B GPS points'
);
select throws_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select other_tracking_id, 48.8566, 2.3522, now(), 'gps-forged-b'
    from gps_point_lifecycle_fixture$$,
  '42501', null,
  'owner A cannot insert into owner B mission'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select is((select count(*)::integer from public.gps_points), 0, 'an empty Clerk sub cannot read GPS points');
select throws_ok(
  $$insert into public.gps_points (mission_id, latitude, longitude, recorded_at, client_point_id)
    select tracking_id, 48.8566, 2.3522, now(), 'gps-empty-owner'
    from gps_point_lifecycle_fixture$$,
  '42501', null,
  'an empty Clerk sub cannot insert GPS points'
);

select * from finish();
rollback;
