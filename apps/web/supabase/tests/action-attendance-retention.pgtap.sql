begin;
select plan(49);

select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_entries'::regclass), 'nominative entries remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_entry_audit'::regclass), 'entry snapshots remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_teams'::regclass), 'private teams remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_team_audit'::regclass), 'team snapshots remain RLS protected');
select ok(not has_table_privilege('anon', 'public.action_attendance_entries', 'SELECT'), 'public roles cannot read roster identities');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_team_members', 'SELECT'), 'authenticated browser roles cannot read team composition');
select ok(has_function_privilege('service_role', 'public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb)', 'EXECUTE'), 'the existing server mutation role can update attendance entries');
select ok(not has_function_privilege('authenticated', 'public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb)', 'EXECUTE'), 'authenticated browser roles cannot mutate attendance entries directly');
select ok(not has_function_privilege('anon', 'public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb)', 'EXECUTE'), 'anonymous users cannot mutate attendance entries');
select ok(has_function_privilege('service_role', 'public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb)', 'EXECUTE'), 'the existing server mutation role can update attendance teams');
select ok(not has_function_privilege('authenticated', 'public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb)', 'EXECUTE'), 'authenticated browser roles cannot mutate teams directly');
select ok(not has_function_privilege('service_role', 'public.guard_action_attendance_retention_window()', 'EXECUTE'), 'the trigger helper has no direct service-role execution grant');
select ok(has_function_privilege('service_role', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'the existing server maintenance role can call the purge');
select ok(not has_function_privilege('authenticated', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'authenticated browser roles cannot call the purge');
select ok(not has_function_privilege('anon', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'anonymous users cannot call the purge');

create temp table attendance_retention_fixture (
  expired_action_id uuid primary key,
  recent_action_id uuid not null,
  legacy_action_id uuid not null,
  recent_entry_id uuid,
  legacy_entry_id uuid,
  linked_entry_id uuid,
  free_entry_id uuid,
  removed_entry_id uuid,
  team_id uuid,
  expired_action_date date not null,
  expired_deadline timestamptz not null,
  legacy_deadline timestamptz not null
);
grant select, insert, update on attendance_retention_fixture to service_role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-retention-test"}', true);

do $$
declare
  v_expired uuid := '11111111-1111-4111-8111-111111111901';
  v_recent uuid := '11111111-1111-4111-8111-111111111902';
  v_legacy uuid := '11111111-1111-4111-8111-111111111903';
  v_seed_time timestamptz := now() + interval '365 days';
  v_expired_action_date date := timezone('UTC', v_seed_time)::date;
  v_expired_deadline timestamptz := ((v_expired_action_date + time '12:00') at time zone 'UTC') + interval '90 days';
  v_legacy_deadline timestamptz := (((v_expired_action_date + 1)::timestamp at time zone 'Asia/Tokyo') - interval '1 microsecond') + interval '90 days';
begin
  insert into public.actions(id, created_by_clerk_id, action_date, event_start_time, event_end_time, action_timezone, location_label, status, action_phase)
  values (v_expired, 'attendance-retention-test', v_expired_action_date, '09:00', '12:00', 'UTC', 'Expired action', 'approved', 'post_action_complete'),
         (v_recent, 'attendance-retention-test', v_expired_action_date + 1, '09:00', '12:00', 'UTC', 'Recent action', 'approved', 'post_action_complete'),
         (v_legacy, 'attendance-retention-test', v_expired_action_date, '09:00', null, 'Asia/Tokyo', 'Legacy action without end', 'approved', 'post_action_complete');
  insert into public.action_registrations(action_id, user_id, registration_status)
    values (v_expired, 'attendance-retention-registered-user', 'confirmed');
  insert into public.action_participants(action_id, user_id, participation_status)
    values (v_expired, 'attendance-retention-final-user', 'confirmed');
  insert into public.action_statistical_versions(
    action_id, version_number, source_updated_at, publication_kind, status, action_phase,
    review_state, access_mode, moderation_visibility, data_provenance, action_date,
    location_label, preparation_data
  ) values (
    v_expired, 1, ((v_expired_action_date + time '12:00') at time zone 'UTC'), 'approved_published', 'approved', 'post_action_complete',
    'approved', 'public', 'visible', 'real', v_expired_action_date, 'Expired action', '{}'::jsonb
  );
  insert into attendance_retention_fixture(expired_action_id, recent_action_id, legacy_action_id, expired_action_date, expired_deadline, legacy_deadline)
    values (v_expired, v_recent, v_legacy, v_expired_action_date, v_expired_deadline, v_legacy_deadline);
end $$;

update attendance_retention_fixture as fixture set recent_entry_id =
  (public.mutate_action_attendance_entry(fixture.recent_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449011', 'add', null, null, '{"display_label":"Présence récente","attendance_status":"unknown"}'::jsonb)->>'id')::uuid;
update attendance_retention_fixture as fixture set legacy_entry_id =
  (public.mutate_action_attendance_entry(fixture.legacy_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449012', 'add', null, null, '{"display_label":"Présence historique","attendance_status":"unknown"}'::jsonb)->>'id')::uuid;

update attendance_retention_fixture set
  linked_entry_id = (select id from public.action_attendance_entries where action_id = expired_action_id and clerk_user_id = 'attendance-retention-registered-user');

update attendance_retention_fixture as fixture set free_entry_id =
  (public.mutate_action_attendance_entry(fixture.expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449001', 'add', null, null, '{"display_label":"Nom confidentiel","attendance_status":"unknown"}'::jsonb)->>'id')::uuid;
update attendance_retention_fixture as fixture set removed_entry_id =
  (public.mutate_action_attendance_entry(fixture.expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449002', 'add', null, null, '{"display_label":"Identité retirée","attendance_status":"unknown"}'::jsonb)->>'id')::uuid;
select public.mutate_action_attendance_entry(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449003', 'delete', (select removed_entry_id from attendance_retention_fixture), 1, '{}'::jsonb)
from attendance_retention_fixture;
select is((select deleted_at is not null from public.action_attendance_entries where id = (select removed_entry_id from attendance_retention_fixture)), true, 'removing a roster row is logical and leaves the audit available until retention');
select ok(exists (select 1 from public.action_attendance_entry_audit where entry_id = (select removed_entry_id from attendance_retention_fixture) and after_value->>'display_label' = 'Identité retirée'), 'the logical-removal audit retains its reviewed snapshot before expiry');

update attendance_retention_fixture as fixture set team_id =
  ((public.mutate_action_attendance_team(fixture.expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449004', 'team_create', null, null, null, '[]'::jsonb, '{"name":"Équipe privée"}'::jsonb)->'teams'->0->'team'->>'id')::uuid);
select public.mutate_action_attendance_team(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449005', 'member_assign', null, (select free_entry_id from attendance_retention_fixture), (select team_id from attendance_retention_fixture), jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 1)), '{}'::jsonb)
from attendance_retention_fixture;
select public.mutate_action_attendance_team(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449006', 'leader_set', (select team_id from attendance_retention_fixture), null, null, jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 2)), jsonb_build_object('leaderEntryId', (select free_entry_id from attendance_retention_fixture)::text))
from attendance_retention_fixture;

select is((select expires_at from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), true, 100, null) where action_id = (select expired_action_id from attendance_retention_fixture)), (select expired_deadline from attendance_retention_fixture), 'canonical event expiry is exactly 90 days after the event end');
select is((select expires_at from public.purge_expired_action_attendance_data((select legacy_deadline from attendance_retention_fixture), true, 100, null) where action_id = (select legacy_action_id from attendance_retention_fixture)), (select legacy_deadline from attendance_retention_fixture), 'legacy expiry follows the action timezone and local end of day');
select is((select count(*)::integer from public.purge_expired_action_attendance_data((select expired_deadline - interval '1 microsecond' from attendance_retention_fixture), true, 100, null)), 0, 'dry-run excludes the action one microsecond before expiry');
select is((select count(*)::integer from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), true, 100, null)), 1, 'dry-run includes the action at the exact 90-day deadline');
select is((select outcome from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), true, 100, null) limit 1), 'would_purge', 'dry-run reports the purge without mutating');
select is((select entry_count from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), true, 100, null) limit 1), 3, 'dry-run returns the identity-row count without names');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 3, 'dry-run preserves active and logically removed identities');
select is((select count(*)::integer from public.action_attendance_teams where action_id = (select expired_action_id from attendance_retention_fixture)), 1, 'dry-run preserves teams and composition');
select ok(not exists (select 1 from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), true, 100, null) as p where row_to_json(p)::text like '%Nom confidentiel%' or row_to_json(p)::text like '%Équipe privée%'), 'dry-run output never contains names or team composition');

update public.actions set action_date = '2020-01-01'
where id = (select expired_action_id from attendance_retention_fixture);
select is((public.mutate_action_attendance_entry(
  (select expired_action_id from attendance_retention_fixture), 'organizer-a',
  '44444444-4444-4444-8444-444444449001', 'add', null, null,
  '{"display_label":"Nom confidentiel","attendance_status":"unknown"}'::jsonb
)->>'id')::uuid, (select free_entry_id from attendance_retention_fixture), 'an idempotent entry retry remains valid after expiry');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 3, 'the expired entry retry does not duplicate a nominative row');
select is((public.mutate_action_attendance_team(
  (select expired_action_id from attendance_retention_fixture), 'organizer-a',
  '44444444-4444-4444-8444-444444449004', 'team_create', null, null, null,
  '[]'::jsonb, '{"name":"Équipe privée"}'::jsonb
)->'teams'->0->'team'->>'id')::uuid, (select team_id from attendance_retention_fixture), 'an idempotent team retry remains valid after expiry');
select throws_ok(
  format($sql$select public.mutate_action_attendance_entry(%L, 'organizer-a', %L, 'add', null, null, '{"display_label":"Nouvelle identité","attendance_status":"unknown"}'::jsonb)$sql$,
    (select expired_action_id from attendance_retention_fixture), '44444444-4444-4444-8444-444444449007'),
  'P0001', 'action_attendance_retention_expired', 'free identities cannot be recreated after the retention deadline');
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'team_create', null, null, null, '[]'::jsonb, '{"name":"Nouvelle équipe"}'::jsonb)$sql$,
    (select expired_action_id from attendance_retention_fixture), '44444444-4444-4444-8444-444444449008'),
  'P0001', 'action_attendance_retention_expired', 'teams cannot be created after the retention deadline');
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'team_rename', %L, null, null, %L::jsonb, '{"name":"Renamed after expiry"}'::jsonb)$sql$,
    (select expired_action_id from attendance_retention_fixture), '44444444-4444-4444-8444-444444449009',
    (select team_id from attendance_retention_fixture),
    jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 3))),
  'P0001', 'action_attendance_retention_expired', 'team updates cannot add nominative audit snapshots after expiry');
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'member_assign', null, %L, %L, %L::jsonb, '{}'::jsonb)$sql$,
    (select expired_action_id from attendance_retention_fixture), '44444444-4444-4444-8444-444444449010',
    (select linked_entry_id from attendance_retention_fixture), (select team_id from attendance_retention_fixture),
    jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 3))),
  'P0001', 'action_attendance_retention_expired', 'team composition cannot be changed after expiry');
update public.actions set action_date = (select expired_action_date from attendance_retention_fixture)
where id = (select expired_action_id from attendance_retention_fixture);

update public.actions set action_date = (select expired_action_date + 1 from attendance_retention_fixture)
where id = (select expired_action_id from attendance_retention_fixture);
select is((select outcome from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), false, 100, array[(select expired_action_id from attendance_retention_fixture)]) where action_id = (select expired_action_id from attendance_retention_fixture)), 'conflict', 'purge revalidates a changed action date after dry-run');
update public.actions set action_date = (select expired_action_date from attendance_retention_fixture)
where id = (select expired_action_id from attendance_retention_fixture);

select is((select outcome from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), false, 100, array[(select expired_action_id from attendance_retention_fixture)]) where action_id = (select expired_action_id from attendance_retention_fixture)), 'purged', 'the explicit dry-run candidate is purged atomically');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes active and logically removed identities');
select is((select count(*)::integer from public.action_attendance_entry_audit where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes nominative before/after snapshots');
select is((select count(*)::integer from public.action_attendance_teams where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes private teams and membership');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes team composition rows');
select is((select count(*)::integer from public.action_attendance_team_audit where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes team names, leaders and composition snapshots');
select is((select outcome from public.purge_expired_action_attendance_data((select expired_deadline from attendance_retention_fixture), false, 100, array[(select expired_action_id from attendance_retention_fixture)]) where action_id = (select expired_action_id from attendance_retention_fixture)), 'already_purged', 'replaying the purge is idempotent');
update public.actions set action_date = current_date - 365
where id = (select expired_action_id from attendance_retention_fixture);
update public.action_registrations set registration_status = 'pending'
where action_id = (select expired_action_id from attendance_retention_fixture)
  and user_id = 'attendance-retention-registered-user';
update public.action_registrations set registration_status = 'confirmed'
where action_id = (select expired_action_id from attendance_retention_fixture)
  and user_id = 'attendance-retention-registered-user';
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'a later registration update cannot recreate an expired operational identity');
select is((select count(*)::integer from public.action_attendance_entry_audit where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'registration replay does not recreate nominative audit snapshots after purge');
select is((select count(*)::integer from public.actions where id = (select expired_action_id from attendance_retention_fixture)), 1, 'the action itself is preserved');
select is((select count(*)::integer from public.action_registrations where action_id = (select expired_action_id from attendance_retention_fixture)), 1, 'registrations are preserved independently');
select is((select count(*)::integer from public.action_participants where action_id = (select expired_action_id from attendance_retention_fixture)), 1, 'final participation proof is preserved and not recalculated');
select is((select count(*)::integer from public.action_statistical_versions where action_id = (select expired_action_id from attendance_retention_fixture)), 1, 'collective statistical snapshots are preserved');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select recent_action_id from attendance_retention_fixture)), 1, 'a recent action roster remains available');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select legacy_action_id from attendance_retention_fixture)), 1, 'an action without an end time uses local end-of-day conservatively');

reset role;
select * from finish();
rollback;
