begin;

select plan(54);

select has_table('public', 'action_rides', 'ride table exists');
select has_table('public', 'action_ride_requests', 'ride request table exists');
select has_index('public', 'action_ride_requests_active_passenger_ride_idx', 'active passenger request is unique per ride');
select has_index('public', 'action_rides_action_id_idx', 'rides are indexed by action and state');
select ok((select relrowsecurity from pg_class where oid = 'public.action_rides'::regclass), 'rides have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_ride_requests'::regclass), 'requests have RLS enabled');
select ok(not has_table_privilege('anon', 'public.action_rides', 'SELECT'), 'anon cannot read rides');
select ok(not has_table_privilege('anon', 'public.action_rides', 'INSERT'), 'anon cannot insert rides');
select ok(not has_table_privilege('authenticated', 'public.action_ride_requests', 'UPDATE'), 'authenticated cannot update requests');
select ok(has_table_privilege('service_role', 'public.action_rides', 'SELECT'), 'service_role can read rides');
select ok(has_table_privilege('service_role', 'public.action_ride_requests', 'INSERT'), 'service_role can insert requests');
select ok(has_function_privilege('service_role', 'public.action_ride_capacity(uuid)', 'EXECUTE'), 'service_role can read canonical capacity');
select ok(has_function_privilege('service_role', 'public.is_action_ride_eligible_member(uuid, text)', 'EXECUTE'), 'service_role can check member eligibility');
select ok(has_function_privilege('service_role', 'public.is_action_ride_departure_eligible(uuid, timestamptz)', 'EXECUTE'), 'service_role can check departure eligibility');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"ride-service"}', true);

select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
    values (gen_random_uuid(), '', '1er arrondissement', now() + interval '1 day', 1)$$,
  '23514', null, 'blank driver identity is rejected'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
    values (gen_random_uuid(), 'ride-driver', '', now() + interval '1 day', 1)$$,
  '23514', null, 'blank origin zone is rejected'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
    values (gen_random_uuid(), 'ride-driver', '1er arrondissement', now() + interval '1 day', 0)$$,
  '23514', null, 'zero total seats is rejected'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
    values (gen_random_uuid(), 'ride-driver', '1er arrondissement', now() + interval '1 day', 9)$$,
  '23514', null, 'more than eight total seats is rejected'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total, note)
    values (gen_random_uuid(), 'ride-driver', '1er arrondissement', now() + interval '1 day', 1, repeat('x', 201))$$,
  '23514', null, 'ride notes are bounded'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total, status)
    values (gen_random_uuid(), 'ride-driver', '1er arrondissement', now() + interval '1 day', 1, 'pending')$$,
  '23514', null, 'ride status is constrained'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id, seats_requested)
    values (gen_random_uuid(), 'ride-passenger', 0)$$,
  '23514', null, 'zero requested seats is rejected'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id, seats_requested)
    values (gen_random_uuid(), 'ride-passenger', 5)$$,
  '23514', null, 'more than four requested seats is rejected'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id, message)
    values (gen_random_uuid(), 'ride-passenger', repeat('x', 201))$$,
  '23514', null, 'request messages are bounded'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id, status)
    values (gen_random_uuid(), 'ride-passenger', 'open')$$,
  '23514', null, 'request status is constrained'
);
select throws_ok(
  $$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
    values (gen_random_uuid(), 'ride-driver', '1er arrondissement', now() + interval '1 day', 1)$$,
  '23503', null, 'unknown action foreign key is rejected'
);

create temp table action_ride_fixture (action_id uuid primary key, ride_id uuid, constrained_ride_id uuid);

select lives_ok($fixture$
  do $$
  declare
    v_action_id uuid := gen_random_uuid();
  begin
    insert into public.actions (
      id, created_by_clerk_id, action_date, location_label, status,
      action_phase, published_at, moderation_visibility, access_mode,
      review_state, event_start_time
    ) values (
      v_action_id, 'ride-creator', current_date + 14, 'Ride fixture',
      'approved', 'pre_action', timezone('utc', now()), 'visible', 'public',
      'not_required', time '10:00'
    );
    insert into public.action_registrations (action_id, user_id, registration_status)
    values (v_action_id, 'ride-driver', 'confirmed'),
           (v_action_id, 'ride-driver-two', 'confirmed'),
           (v_action_id, 'ride-passenger', 'confirmed'),
           (v_action_id, 'ride-passenger-a', 'confirmed'),
           (v_action_id, 'ride-passenger-b', 'confirmed');
    insert into action_ride_fixture (action_id) values (v_action_id);
  end;
  $$;
$fixture$, 'future public action and confirmed registrations can be prepared');

select lives_ok($$insert into public.action_rides (
    action_id, driver_user_id, origin_zone_name, departure_at, seats_total, note
  ) values (
    (select action_id from action_ride_fixture),
    'ride-driver', '1er arrondissement',
    ((current_date + 14)::timestamp + time '08:00') at time zone 'Europe/Paris',
    8, 'Départ groupé'
  )$$, 'ride can be stored with bounded private fields');
update action_ride_fixture
set ride_id = (select id from public.action_rides where driver_user_id = 'ride-driver');
select is((select seats_total::integer from public.action_rides where id = (select ride_id from action_ride_fixture)), 8, 'ride stores its declared total');
select is((select seats_reserved from public.action_ride_capacity((select ride_id from action_ride_fixture))), 0, 'zero accepted requests reserve zero seats');
select is((select seats_available from public.action_ride_capacity((select ride_id from action_ride_fixture))), 8, 'capacity starts at the declared total');
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id)
    values ((select ride_id from action_ride_fixture), 'ride-driver')$$,
  'P0001', null, 'driver cannot request their own ride'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id)
    values ((select ride_id from action_ride_fixture), 'ride-unregistered')$$,
  'P0001', null, 'unregistered passenger cannot request a ride'
);

select lives_ok($$insert into public.action_ride_requests (
    ride_id, passenger_user_id, seats_requested, message
  ) values (
    (select ride_id from action_ride_fixture), 'ride-passenger', 2, 'Je peux partager les frais'
  )$$, 'pending request can be stored');
select is((select seats_reserved from public.action_ride_capacity((select ride_id from action_ride_fixture))), 0, 'pending requests do not reserve seats');
select lives_ok($$update public.action_ride_requests
  set status = 'accepted', resolved_at = timezone('utc', now())
  where ride_id = (select ride_id from action_ride_fixture)
    and passenger_user_id = 'ride-passenger'$$, 'accepted request can be resolved');
select is((select seats_reserved from public.action_ride_capacity((select ride_id from action_ride_fixture))), 2, 'accepted seats use the canonical capacity owner');
select is((select seats_available from public.action_ride_capacity((select ride_id from action_ride_fixture))), 6, 'available seats subtract accepted requests only');
select throws_ok(
  $$update public.action_rides set seats_total = 1 where id = (select ride_id from action_ride_fixture)$$,
  'P0001', null, 'ride total cannot fall below accepted seats'
);
select throws_ok(
  $$insert into public.action_ride_requests (ride_id, passenger_user_id, seats_requested)
    values ((select ride_id from action_ride_fixture), 'ride-passenger', 1)$$,
  '23505', null, 'one pending or accepted request per passenger and ride'
);

select lives_ok($$insert into public.action_rides (
    action_id, driver_user_id, origin_zone_name, departure_at, seats_total
  ) values (
    (select action_id from action_ride_fixture),
    'ride-driver-two', '2e arrondissement',
    ((current_date + 14)::timestamp + time '08:30') at time zone 'Europe/Paris',
    1
  )$$, 'a second ride can be created for the action');
update action_ride_fixture
set constrained_ride_id = (select id from public.action_rides where driver_user_id = 'ride-driver-two');
select lives_ok($$insert into public.action_ride_requests (
    ride_id, passenger_user_id, seats_requested, status, resolved_at
  ) values (
    (select constrained_ride_id from action_ride_fixture), 'ride-passenger-a', 1, 'accepted', timezone('utc', now())
  )$$, 'first accepted request fits capacity');
select throws_ok(
  $$insert into public.action_ride_requests (
    ride_id, passenger_user_id, seats_requested, status, resolved_at
  ) values (
    (select constrained_ride_id from action_ride_fixture), 'ride-passenger-b', 1, 'accepted', timezone('utc', now())
  )$$,
  'P0001', null, 'capacity trigger rejects concurrent-capacity overflow'
);
select is((select seats_available from public.action_ride_capacity((select constrained_ride_id from action_ride_fixture))), 0, 'full ride has no available seats');

select ok(public.is_action_ride_eligible_member((select action_id from action_ride_fixture), 'ride-driver'), 'confirmed driver registration is eligible');
select ok(not public.is_action_ride_eligible_member((select action_id from action_ride_fixture), 'ride-unregistered'), 'unregistered user is not eligible');
select ok(public.is_action_ride_departure_eligible(
  (select action_id from action_ride_fixture),
  ((current_date + 14)::timestamp + time '08:00') at time zone 'Europe/Paris'
), 'departure before the action start is eligible');
select ok(not public.is_action_ride_departure_eligible(
  (select action_id from action_ride_fixture),
  ((current_date + 14)::timestamp + time '10:30') at time zone 'Europe/Paris'
), 'departure after the action start is rejected');

select lives_ok($fixture$
  do $$
  declare
    v_action_id uuid := gen_random_uuid();
  begin
    insert into public.actions (
      id, created_by_clerk_id, action_date, location_label, status,
      action_phase, published_at, moderation_visibility, access_mode,
      review_state, event_start_time
    ) values (
      v_action_id, 'ride-no-time', current_date + 14, 'Ride no-time fixture',
      'approved', 'pre_action', timezone('utc', now()), 'visible', 'public',
      'not_required', null
    );
  end;
  $$;
$fixture$, 'action without a start time can be represented');
select ok(not public.is_action_ride_departure_eligible(
  (select max(id) from public.actions where created_by_clerk_id = 'ride-no-time'),
  ((current_date + 14)::timestamp + time '08:00') at time zone 'Europe/Paris'
), 'missing action start time fails closed');

select lives_ok($$delete from public.actions where id = (select action_id from action_ride_fixture)$$, 'action deletion is allowed in the fixture');
select is((select count(*)::integer from public.action_rides where action_id = (select action_id from action_ride_fixture)), 0, 'action deletion cascades rides');
select is((select count(*)::integer from public.action_ride_requests), 0, 'ride deletion cascades requests');

set local role anon;
select throws_ok($$select count(*) from public.action_rides$$, '42501', null, 'anon cannot select private ride data');
select throws_ok($$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at) values (gen_random_uuid(), 'forged', '1er arrondissement', now())$$, '42501', null, 'anon cannot insert rides');

select * from finish();
rollback;
