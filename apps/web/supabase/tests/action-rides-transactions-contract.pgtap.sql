begin;

select plan(24);

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

select * from finish();
rollback;
