begin;
select plan(17);

select ok(not has_table_privilege('anon', 'public.action_participant_visibility_consents', 'SELECT'), 'anonymous users cannot read visibility consent rows');
select ok(not has_table_privilege('authenticated', 'public.action_participant_visibility_consents', 'SELECT'), 'authenticated users cannot read visibility consent rows directly');
select ok(not has_function_privilege('anon', 'public.request_action_attendance_claim(uuid, text, uuid)', 'EXECUTE'), 'anonymous users cannot submit attendance claims directly');
select ok(not has_function_privilege('authenticated', 'public.request_action_attendance_claim(uuid, text, uuid)', 'EXECUTE'), 'authenticated users cannot bypass the authorized server for attendance claims');
select ok(has_function_privilege('service_role', 'public.request_action_attendance_claim(uuid, text, uuid)', 'EXECUTE'), 'the server can submit an attendance claim');
select ok(has_function_privilege('service_role', 'public.load_public_action_participant_visibility(uuid)', 'EXECUTE'), 'the server can load the bounded public projection');
select ok(not has_function_privilege('anon', 'public.load_public_action_participant_visibility(uuid)', 'EXECUTE'), 'anonymous clients cannot call the projection RPC directly');

create temp table claim_visibility_fixture(action_id uuid primary key, entry_id uuid, member_id text);
grant select, insert on claim_visibility_fixture to service_role;

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_entry_id uuid := gen_random_uuid();
begin
  insert into public.actions(
    id, created_by_clerk_id, action_date, location_label, status, action_phase,
    published_at, event_start_at, event_start_time, access_mode, moderation_visibility
  ) values (
    v_action_id, 'claim-test-organizer', current_date - 1, 'Fixture', 'approved',
    'post_action_complete', now() - interval '1 day', now() - interval '1 day', '09:00', 'public', 'visible'
  );
  insert into public.action_attendance_entries(
    id, action_id, display_label, provenance, attendance_status, observed_at, created_by, updated_by
  ) values (
    v_entry_id, v_action_id, 'Membre attendu', 'organizer_entry', 'present', now(), 'claim-test-organizer', 'claim-test-organizer'
  );
  insert into claim_visibility_fixture values (v_action_id, v_entry_id, 'claim-test-member');
end $$;

set local role service_role;
select * from public.request_action_attendance_claim(
  (select action_id from claim_visibility_fixture),
  (select member_id from claim_visibility_fixture),
  (select entry_id from claim_visibility_fixture)
);
select is((select already_requested from public.request_action_attendance_claim(
  (select action_id from claim_visibility_fixture),
  (select member_id from claim_visibility_fixture),
  (select entry_id from claim_visibility_fixture)
)), true, 'retrying the same member/action/entry claim returns the canonical pending request');
select throws_ok(
  format('select * from public.request_action_attendance_claim(%L, %L, %L)',
    (select action_id from claim_visibility_fixture), 'claim-test-other-member', gen_random_uuid()),
  'P0002', null, 'an unknown roster id has the same neutral unavailable failure'
);
reset role;
select is((select participation_status from public.action_participants where action_id = (select action_id from claim_visibility_fixture) and user_id = 'claim-test-member'), 'pending', 'a roster claim creates only a pending participation request');
select ok((select clerk_user_id is null from public.action_attendance_entries where id = (select entry_id from claim_visibility_fixture)), 'requesting a claim does not link the private roster identity');

set local role service_role;
select throws_ok(
  format('update public.action_participants set participation_status = %L where action_id = %L and user_id = %L',
    'confirmed', (select action_id from claim_visibility_fixture), 'claim-test-member'),
  '42501', 'attendance_claim_reviewer_required', 'a claim cannot be confirmed without the authorized review actor'
);
update public.action_participants
   set participation_status = 'confirmed', attendance_claim_reviewed_by_clerk_id = 'claim-test-organizer'
 where action_id = (select action_id from claim_visibility_fixture) and user_id = 'claim-test-member';
reset role;
select is((select clerk_user_id from public.action_attendance_entries where id = (select entry_id from claim_visibility_fixture)), 'claim-test-member', 'authorized confirmation links the account to the same present row');
select is((select provenance from public.action_attendance_entries where id = (select entry_id from claim_visibility_fixture)), 'member_claim', 'the linked identity retains claim provenance');
select is((select count(*)::integer from public.action_attendance_entry_audit where entry_id = (select entry_id from claim_visibility_fixture) and operation = 'link'), 1, 'the identity link is audited once');
select is((select attendance_status from public.action_attendance_entries where id = (select entry_id from claim_visibility_fixture)), 'present', 'claim confirmation preserves the observed presence');
select is((select count(*)::integer from public.action_participants where action_id = (select action_id from claim_visibility_fixture) and user_id = 'claim-test-member' and participation_status = 'confirmed'), 1, 'one confirmed participation remains canonical after the claim');

select * from finish();
rollback;
