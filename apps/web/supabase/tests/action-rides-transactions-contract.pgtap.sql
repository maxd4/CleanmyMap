begin;

select plan(43);

select ok(to_regprocedure('public.accept_action_ride_request(uuid,text)') is not null, 'accept RPC exists');
select ok(to_regprocedure('public.decline_action_ride_request(uuid,text)') is not null, 'decline RPC exists');
select ok(to_regprocedure('public.withdraw_action_ride_request(uuid,text)') is not null, 'withdraw RPC exists');
select ok(to_regprocedure('public.transition_action_ride(uuid,text,text)') is not null, 'transition RPC exists');
select ok(to_regprocedure('public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)') is not null, 'detail update RPC exists');

select ok(has_function_privilege('service_role', 'public.accept_action_ride_request(uuid,text)', 'EXECUTE'), 'service role can accept requests');
select ok(has_function_privilege('service_role', 'public.decline_action_ride_request(uuid,text)', 'EXECUTE'), 'service role can decline requests');
select ok(has_function_privilege('service_role', 'public.withdraw_action_ride_request(uuid,text)', 'EXECUTE'), 'service role can withdraw requests');
select ok(has_function_privilege('service_role', 'public.transition_action_ride(uuid,text,text)', 'EXECUTE'), 'service role can transition rides');
select ok(has_function_privilege('service_role', 'public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)', 'EXECUTE'), 'service role can update ride details');

select ok(not has_function_privilege('anon', 'public.accept_action_ride_request(uuid,text)', 'EXECUTE'), 'anon cannot accept requests');
select ok(not has_function_privilege('authenticated', 'public.accept_action_ride_request(uuid,text)', 'EXECUTE'), 'authenticated cannot accept requests directly');
select ok(not has_function_privilege('anon', 'public.decline_action_ride_request(uuid,text)', 'EXECUTE'), 'anon cannot decline requests');
select ok(not has_function_privilege('authenticated', 'public.decline_action_ride_request(uuid,text)', 'EXECUTE'), 'authenticated cannot decline requests directly');
select ok(not has_function_privilege('anon', 'public.withdraw_action_ride_request(uuid,text)', 'EXECUTE'), 'anon cannot withdraw requests');
select ok(not has_function_privilege('authenticated', 'public.withdraw_action_ride_request(uuid,text)', 'EXECUTE'), 'authenticated cannot withdraw requests directly');
select ok(not has_function_privilege('anon', 'public.transition_action_ride(uuid,text,text)', 'EXECUTE'), 'anon cannot transition rides');
select ok(not has_function_privilege('authenticated', 'public.transition_action_ride(uuid,text,text)', 'EXECUTE'), 'authenticated cannot transition rides directly');
select ok(not has_function_privilege('anon', 'public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)', 'EXECUTE'), 'anon cannot update rides');
select ok(not has_function_privilege('authenticated', 'public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)', 'EXECUTE'), 'authenticated cannot update rides directly');

select like(
  pg_get_functiondef(to_regprocedure('public.accept_action_ride_request(uuid,text)')),
  '%for update of r%',
  'acceptance locks the ride before the request'
);
select like(
  pg_get_functiondef(to_regprocedure('public.accept_action_ride_request(uuid,text)')),
  '%action_ride_capacity(v_ride.id)%',
  'acceptance rereads the canonical capacity owner'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'app_notifications_action_ride_cancel_identity_idx'
  ),
  'ride cancellation notification identity is unique'
);
select like(
  pg_get_functiondef(to_regprocedure('public.transition_action_ride(uuid,text,text)')),
  '%on conflict do nothing%',
  'ride cancellation notifications are idempotent'
);
select like(
  pg_get_functiondef(to_regprocedure('public.transition_action_ride(uuid,text,text)')),
  '%where rr.ride_id = v_ride.id and rr.status = ''pending''%',
  'pending request transition qualifies SQL columns'
);
select like(
  pg_get_functiondef(to_regprocedure('public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)')),
  '%or v_ride.status <> ''open''%',
  'ride detail updates require an open ride'
);

create temp table action_ride_transition_fixture (action_id uuid primary key, close_ride_id uuid, cancel_ride_id uuid);

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
      v_action_id, 'ride-transition-creator', current_date + 14, 'Ride transaction fixture',
      'approved', 'pre_action', timezone('utc', now()), 'visible', 'public',
      'not_required', time '10:00'
    );
    insert into public.action_registrations (action_id, user_id, registration_status)
    values (v_action_id, 'ride-transition-driver', 'confirmed'),
           (v_action_id, 'ride-transition-pending', 'confirmed'),
           (v_action_id, 'ride-transition-accepted', 'confirmed');
    insert into action_ride_transition_fixture (action_id) values (v_action_id);
  end;
  $$;
$fixture$, 'transition fixtures have confirmed participants');

select lives_ok($$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
  values ((select action_id from action_ride_transition_fixture), 'ride-transition-driver', '1er arrondissement',
    ((current_date + 14)::timestamp + time '08:00') at time zone 'Europe/Paris', 2)$$,
  'open ride can be prepared for closure');
update action_ride_transition_fixture
set close_ride_id = (select id from public.action_rides where driver_user_id = 'ride-transition-driver' and status = 'open');
select lives_ok($$select * from public.update_action_ride_details(
    (select close_ride_id from action_ride_transition_fixture), 'ride-transition-driver',
    '2e arrondissement', ((current_date + 14)::timestamp + time '08:15') at time zone 'Europe/Paris', 2, 'Horaire ajusté')$$,
  'open ride can be modified');
select is((select note from public.action_rides where id = (select close_ride_id from action_ride_transition_fixture)),
  'Horaire ajusté', 'open ride modification is persisted');
select lives_ok($$insert into public.action_ride_requests (ride_id, passenger_user_id, seats_requested)
  values ((select close_ride_id from action_ride_transition_fixture), 'ride-transition-pending', 1)$$,
  'pending request can be prepared for closure');
select lives_ok($$select * from public.transition_action_ride(
    (select close_ride_id from action_ride_transition_fixture), 'ride-transition-driver', 'closed')$$,
  'closing a ride resolves pending requests');
select throws_ok($$select * from public.update_action_ride_details(
    (select close_ride_id from action_ride_transition_fixture), 'ride-transition-driver',
    '2e arrondissement', ((current_date + 14)::timestamp + time '08:20') at time zone 'Europe/Paris', 2, 'Ne doit pas changer')$$,
  'P0001', null, 'closed ride cannot be modified');
select is((select note from public.action_rides where id = (select close_ride_id from action_ride_transition_fixture)),
  'Horaire ajusté', 'closed ride remains unchanged');
select is((select status from public.action_ride_requests where ride_id = (select close_ride_id from action_ride_transition_fixture)),
  'declined', 'closure declines pending requests');

select lives_ok($$insert into public.action_rides (action_id, driver_user_id, origin_zone_name, departure_at, seats_total)
  values ((select action_id from action_ride_transition_fixture), 'ride-transition-driver', '1er arrondissement',
    ((current_date + 14)::timestamp + time '08:00') at time zone 'Europe/Paris', 2)$$,
  'open ride can be prepared for cancellation');
update action_ride_transition_fixture
set cancel_ride_id = (select id from public.action_rides where driver_user_id = 'ride-transition-driver' and status = 'open');
select lives_ok($$insert into public.action_ride_requests (ride_id, passenger_user_id, seats_requested, status, resolved_at)
  values ((select cancel_ride_id from action_ride_transition_fixture), 'ride-transition-accepted', 1, 'accepted', timezone('utc', now()))$$,
  'accepted request can be prepared for cancellation');
select lives_ok($$select * from public.transition_action_ride(
    (select cancel_ride_id from action_ride_transition_fixture), 'ride-transition-driver', 'cancelled')$$,
  'cancellation resolves accepted ride state');
select throws_ok($$select * from public.update_action_ride_details(
    (select cancel_ride_id from action_ride_transition_fixture), 'ride-transition-driver',
    '2e arrondissement', ((current_date + 14)::timestamp + time '08:20') at time zone 'Europe/Paris', 2, 'Ne doit pas changer')$$,
  'P0001', null, 'cancelled ride cannot be modified');
select is((select status from public.action_rides where id = (select cancel_ride_id from action_ride_transition_fixture)),
  'cancelled', 'cancelled ride remains terminal');
select is((select count(*)::integer from public.app_notifications where payload ->> 'rideId' = (select cancel_ride_id::text from action_ride_transition_fixture)),
  1, 'cancellation sends one passenger notification');
select lives_ok($$select * from public.transition_action_ride(
    (select cancel_ride_id from action_ride_transition_fixture), 'ride-transition-driver', 'cancelled')$$,
  'repeating cancellation is idempotent');
select is((select count(*)::integer from public.app_notifications where payload ->> 'rideId' = (select cancel_ride_id::text from action_ride_transition_fixture)),
  1, 'repeated cancellation does not notify twice');

select * from finish();
rollback;
