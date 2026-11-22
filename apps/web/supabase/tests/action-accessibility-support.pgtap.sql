begin;

select plan(24);

select has_table('public', 'action_accessibility_support_requests', 'private action accessibility requests exist');
select ok((select relrowsecurity from pg_class where oid = 'public.action_accessibility_support_requests'::regclass), 'private requests have RLS enabled');
select ok(not has_table_privilege('anon', 'public.action_accessibility_support_requests', 'SELECT'), 'anonymous users cannot read requests');
select ok(not has_table_privilege('authenticated', 'public.action_accessibility_support_requests', 'SELECT'), 'authenticated users cannot read requests directly');
select ok(not has_table_privilege('authenticated', 'public.action_accessibility_support_requests', 'INSERT'), 'authenticated users cannot insert requests directly');
select ok(not has_table_privilege('authenticated', 'public.action_accessibility_support_requests', 'UPDATE'), 'authenticated users cannot update requests directly');
select ok(has_table_privilege('service_role', 'public.action_accessibility_support_requests', 'SELECT'), 'service role can read requests through authorized routes');
select ok(has_function_privilege('service_role', 'public.purge_expired_action_accessibility_support_requests(timestamptz,boolean,integer)', 'EXECUTE'), 'service role can run request retention');
select ok(not has_function_privilege('authenticated', 'public.purge_expired_action_accessibility_support_requests(timestamptz,boolean,integer)', 'EXECUTE'), 'authenticated users cannot run request retention');

create temp table accessibility_support_fixture (action_id uuid not null, request_id uuid not null);
grant select, insert on accessibility_support_fixture to service_role;
grant select on accessibility_support_fixture to anon, authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"accessibility-support-test"}', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_request_id uuid := gen_random_uuid();
begin
  insert into public.actions (
    id, created_by_clerk_id, action_date, event_start_time, location_label,
    status, action_phase, access_mode, moderation_visibility, review_state, published_at
  ) values (
    v_action_id, 'accessibility-organizer', current_date + 50, time '10:00', 'Accessibility contract fixture',
    'approved', 'pre_action', 'public', 'visible', 'approved', now()
  );

  insert into public.action_accessibility_support_requests (
    id, action_id, requester_user_id, requested_needs
  ) values (
    v_request_id, v_action_id, 'accessibility-participant', array['shorter_route', 'rest_breaks']
  );
  insert into accessibility_support_fixture values (v_action_id, v_request_id);
end;
$$;

select is((
  select cardinality(request.requested_needs)::integer
  from public.action_accessibility_support_requests request
  join accessibility_support_fixture fixture on fixture.request_id = request.id
), 2, 'valid functional needs persist as a bounded selection');
select is((
  select request.retention_expires_at::date
  from public.action_accessibility_support_requests request
  join accessibility_support_fixture fixture on fixture.request_id = request.id
), (select a.action_date + 90 from public.actions a join accessibility_support_fixture fixture on fixture.action_id = a.id), 'retention is capped at 90 days after the action date');
select lives_ok($$update public.action_accessibility_support_requests set day_tracking_consent = true where id = (select request_id from accessibility_support_fixture)$$, 'participant consent can enable manual day-of follow-up');
select lives_ok($$update public.action_accessibility_support_requests set arrival_status = 'completed' where id = (select request_id from accessibility_support_fixture)$$, 'consented follow-up can record an arrival check-in');
select lives_ok($$update public.action_accessibility_support_requests set day_tracking_consent = false, arrival_status = null, contact_status = null, departure_status = null where id = (select request_id from accessibility_support_fixture)$$, 'consent can be withdrawn and existing check-in data cleared');
select is((select request.arrival_status from public.action_accessibility_support_requests request join accessibility_support_fixture fixture on fixture.request_id = request.id), null, 'withdrawn consent leaves no arrival check-in data');
select throws_ok($$update public.action_accessibility_support_requests set arrival_status = 'completed' where id = (select request_id from accessibility_support_fixture)$$, '23514', null, 'check-ins cannot be added after consent is withdrawn');
select throws_ok($$update public.action_accessibility_support_requests set requested_needs = array['medical_diagnosis'] where id = (select request_id from accessibility_support_fixture)$$, '23514', null, 'medical or unknown needs are rejected');
select throws_ok($$update public.action_accessibility_support_requests set requested_needs = array[]::text[] where id = (select request_id from accessibility_support_fixture)$$, '23514', null, 'empty need selection is rejected');

select lives_ok($$update public.actions set action_date = current_date + 60 where id = (select action_id from accessibility_support_fixture)$$, 'changing the action date updates private request retention atomically');
select is((
  select request.retention_expires_at::date
  from public.action_accessibility_support_requests request
  join accessibility_support_fixture fixture on fixture.request_id = request.id
), current_date + 150, 'private request expiry follows the revised action date');
select lives_ok($$update public.actions set action_date = current_date - 91 where id = (select action_id from accessibility_support_fixture)$$, 'moving an action far enough into the past reconciles an already-expired request');
select is((select count(*)::integer from public.action_accessibility_support_requests request join accessibility_support_fixture fixture on fixture.request_id = request.id), 0, 'requests whose revised expiry predates their creation are removed');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"accessibility-participant"}', true);
select throws_ok($$select id from public.action_accessibility_support_requests$$, '42501', null, 'participant cannot bypass the private request API');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select id from public.action_accessibility_support_requests$$, '42501', null, 'anonymous users cannot access private requests');

select * from finish();
rollback;
