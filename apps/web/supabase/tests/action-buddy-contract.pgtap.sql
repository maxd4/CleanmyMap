begin;

select plan(43);

select has_table('public', 'action_buddy_availability', 'buddy availability table exists');
select has_table('public', 'action_buddy_requests', 'buddy requests table exists');
select has_table('public', 'action_buddy_proposals', 'buddy proposals table exists');
select has_index('public', 'action_buddy_availability_pk', 'availability is unique per action and mentor');
select has_index('public', 'action_buddy_requests_active_requester_key', 'one active request exists per requester and action');
select has_index('public', 'action_buddy_requests_active_mentor_key', 'one active match exists per mentor and action');
select has_index('public', 'action_buddy_proposals_pending_mentor_request_key', 'one pending proposal exists per mentor and request');
select ok((select relrowsecurity from pg_class where oid = 'public.action_buddy_availability'::regclass), 'availability has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_buddy_requests'::regclass), 'requests have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_buddy_proposals'::regclass), 'proposals have RLS enabled');
select ok(not has_table_privilege('authenticated', 'public.action_buddy_availability', 'SELECT'), 'authenticated cannot read availability directly');
select ok(not has_table_privilege('authenticated', 'public.action_buddy_requests', 'INSERT'), 'authenticated cannot create requests directly');
select ok(not has_table_privilege('authenticated', 'public.action_buddy_proposals', 'UPDATE'), 'authenticated cannot mutate proposals directly');
select ok(has_table_privilege('service_role', 'public.action_buddy_availability', 'SELECT'), 'service_role can read availability');
select ok(has_table_privilege('service_role', 'public.action_buddy_requests', 'INSERT'), 'service_role can insert requests');
select ok(has_table_privilege('service_role', 'public.action_buddy_proposals', 'UPDATE'), 'service_role can resolve proposals');
select ok(has_function_privilege('service_role', 'public.accept_action_buddy_proposal(uuid)', 'EXECUTE'), 'service_role can execute the matching RPC');
select ok(not has_function_privilege('authenticated', 'public.accept_action_buddy_proposal(uuid)', 'EXECUTE'), 'authenticated cannot execute the matching RPC');

create temp table action_buddy_fixture (
  action_id uuid not null,
  request_one uuid not null,
  request_two uuid not null,
  request_self uuid not null,
  request_pending uuid not null,
  request_cancel uuid not null,
  proposal_one uuid not null,
  proposal_two uuid not null,
  proposal_self uuid not null,
  proposal_pending uuid not null,
  proposal_cancel uuid not null
);
grant select on action_buddy_fixture to anon, authenticated;
grant insert on action_buddy_fixture to service_role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"buddy-test-service"}', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_request_one uuid := gen_random_uuid();
  v_request_two uuid := gen_random_uuid();
  v_request_self uuid := gen_random_uuid();
  v_request_pending uuid := gen_random_uuid();
  v_request_cancel uuid := gen_random_uuid();
  v_proposal_one uuid := gen_random_uuid();
  v_proposal_two uuid := gen_random_uuid();
  v_proposal_self uuid := gen_random_uuid();
  v_proposal_pending uuid := gen_random_uuid();
  v_proposal_cancel uuid := gen_random_uuid();
begin
  insert into public.actions (
    id, created_by_clerk_id, action_date, event_start_time, location_label,
    status, action_phase, access_mode, moderation_visibility, review_state, published_at
  ) values (
    v_action_id, 'buddy-organizer', current_date + 30, time '10:00', 'Buddy contract fixture',
    'approved', 'pre_action', 'public', 'visible', 'approved', now()
  );

  insert into public.action_registrations (action_id, user_id, registration_status, registration_source)
  values
    (v_action_id, 'requester-one', 'confirmed', 'group_form'),
    (v_action_id, 'requester-two', 'confirmed', 'group_form'),
    (v_action_id, 'requester-self', 'confirmed', 'group_form'),
    (v_action_id, 'requester-pending-mentor', 'confirmed', 'group_form'),
    (v_action_id, 'requester-cancel', 'confirmed', 'group_form'),
    (v_action_id, 'mentor-one', 'confirmed', 'group_form'),
    (v_action_id, 'mentor-self', 'confirmed', 'group_form'),
    (v_action_id, 'mentor-pending', 'pending', 'group_form'),
    (v_action_id, 'mentor-cancel', 'confirmed', 'group_form');

  insert into public.action_buddy_availability (action_id, mentor_user_id)
  values
    (v_action_id, 'mentor-one'),
    (v_action_id, 'mentor-self'),
    (v_action_id, 'mentor-pending'),
    (v_action_id, 'mentor-cancel');

  insert into public.action_buddy_requests (id, action_id, requester_user_id)
  values
    (v_request_one, v_action_id, 'requester-one'),
    (v_request_two, v_action_id, 'requester-two'),
    (v_request_self, v_action_id, 'mentor-self'),
    (v_request_pending, v_action_id, 'requester-pending-mentor'),
    (v_request_cancel, v_action_id, 'requester-cancel');

  insert into public.action_buddy_proposals (id, request_id, mentor_user_id)
  values
    (v_proposal_one, v_request_one, 'mentor-one'),
    (v_proposal_two, v_request_two, 'mentor-one'),
    (v_proposal_self, v_request_self, 'mentor-self'),
    (v_proposal_pending, v_request_pending, 'mentor-pending'),
    (v_proposal_cancel, v_request_cancel, 'mentor-cancel');

  insert into action_buddy_fixture values (
    v_action_id, v_request_one, v_request_two, v_request_self,
    v_request_pending, v_request_cancel, v_proposal_one, v_proposal_two,
    v_proposal_self, v_proposal_pending, v_proposal_cancel
  );
end;
$$;

select throws_ok(
  $$insert into public.action_buddy_requests (action_id, requester_user_id)
    select action_id, 'requester-one' from action_buddy_fixture$$,
  '23505', null,
  'duplicate active request is rejected'
);
select throws_ok(
  $$insert into public.action_buddy_proposals (request_id, mentor_user_id)
    select request_one, 'mentor-one' from action_buddy_fixture$$,
  '23505', null,
  'duplicate pending proposal is rejected'
);
select throws_ok(
  $$insert into public.action_buddy_requests (action_id, requester_user_id, status)
    select action_id, 'invalid-status-user', 'invalid' from action_buddy_fixture$$,
  '23514', null,
  'request status check is enforced'
);
select throws_ok(
  $$insert into public.action_buddy_proposals (request_id, mentor_user_id, status)
    select request_one, 'another-mentor', 'invalid' from action_buddy_fixture$$,
  '23514', null,
  'proposal status check is enforced'
);

select lives_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_one from action_buddy_fixture))$$,
  'first acceptance succeeds in one transaction'
);
select is(
  (select status from public.action_buddy_requests where id = (select request_one from action_buddy_fixture)),
  'matched',
  'accepted proposal marks its canonical request matched'
);
select is(
  (select status from public.action_buddy_proposals where id = (select proposal_one from action_buddy_fixture)),
  'accepted',
  'selected proposal is accepted'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'requester-one' and type = 'community' and payload ->> 'kind' = 'action_buddy_proposal_created' and payload ->> 'proposalId' = (select proposal_one::text from action_buddy_fixture)),
  1,
  'new proposal creates one community notification for the requester'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'mentor-one' and type = 'community' and payload ->> 'kind' = 'action_buddy_proposal_accepted' and payload ->> 'proposalId' = (select proposal_one::text from action_buddy_fixture)),
  1,
  'accepted proposal creates one community notification for the mentor'
);
select is(
  (select status from public.action_buddy_proposals where id = (select proposal_two from action_buddy_fixture)),
  'pending',
  'a competing request remains pending until its own acceptance is attempted'
);
select throws_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_two from action_buddy_fixture))$$,
  'P0001', null,
  'the same mentor cannot be matched to a second requester on the action'
);
select is(
  (select status from public.action_buddy_requests where id = (select request_two from action_buddy_fixture)),
  'open',
  'conflicting acceptance leaves the second request unchanged'
);
select lives_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_one from action_buddy_fixture))$$,
  'acceptance replay is idempotent for the already matched pair'
);
select is(
  (select status from public.action_buddy_requests where id = (select request_self from action_buddy_fixture)),
  'open',
  'self-match has not changed the request before rejection'
);
select throws_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_self from action_buddy_fixture))$$,
  'P0001', null,
  'self-match is rejected by the transactional RPC'
);
select throws_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_pending from action_buddy_fixture))$$,
  'P0001', null,
  'pending mentor registration is rejected by the transactional RPC'
);

update public.action_buddy_requests
set status = 'cancelled'
where id = (select request_cancel from action_buddy_fixture);
select is(
  (select status from public.action_buddy_proposals where id = (select proposal_cancel from action_buddy_fixture)),
  'withdrawn',
  'cancelling a request withdraws its pending proposals atomically'
);
select is(
  (select count(*)::integer
   from public.app_notifications
   where type = 'community'
     and payload ->> 'kind' = 'action_buddy_request_cancelled'
     and payload ->> 'requestId' = (select request_cancel::text from action_buddy_fixture)),
  0,
  'cancelling a request without a matched mentor emits no notification'
);
update public.action_buddy_requests
set status = 'cancelled'
where id = (select request_one from action_buddy_fixture);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'mentor-one' and type = 'community' and payload ->> 'kind' = 'action_buddy_request_cancelled' and payload ->> 'requestId' = (select request_one::text from action_buddy_fixture)),
  1,
  'cancelling a matched request notifies the former mentor once'
);
update public.action_buddy_requests
set status = 'cancelled'
where id = (select request_one from action_buddy_fixture);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'mentor-one' and type = 'community' and payload ->> 'kind' = 'action_buddy_request_cancelled' and payload ->> 'requestId' = (select request_one::text from action_buddy_fixture)),
  1,
  'replaying cancellation does not duplicate the notification'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"requester-one"}', true);
select throws_ok(
  $$select * from public.accept_action_buddy_proposal((select proposal_two from action_buddy_fixture))$$,
  '42501', null,
  'authenticated cannot execute the matching RPC'
);
select throws_ok(
  $$select count(*) from public.action_buddy_availability$$,
  '42501', null,
  'authenticated cannot read private availability rows'
);
select throws_ok(
  $$insert into public.action_buddy_requests (action_id, requester_user_id)
    select action_id, 'forged-requester' from action_buddy_fixture$$,
  '42501', null,
  'authenticated cannot insert a buddy request directly'
);
select throws_ok(
  $$update public.action_buddy_proposals set status = 'accepted'$$,
  '42501', null,
  'authenticated cannot update proposals directly'
);
select throws_ok(
  $$delete from public.action_buddy_requests$$,
  '42501', null,
  'authenticated cannot delete buddy requests directly'
);

select * from finish();
rollback;
