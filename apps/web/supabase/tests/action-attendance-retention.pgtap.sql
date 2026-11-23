begin;
select plan(31);

select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_entries'::regclass), 'nominative entries remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_entry_audit'::regclass), 'entry snapshots remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_teams'::regclass), 'private teams remain RLS protected');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_team_audit'::regclass), 'team snapshots remain RLS protected');
select ok(not has_table_privilege('anon', 'public.action_attendance_entries', 'SELECT'), 'public roles cannot read roster identities');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_team_members', 'SELECT'), 'authenticated browser roles cannot read team composition');
select ok(has_function_privilege('service_role', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'the existing server maintenance role can call the purge');
select ok(not has_function_privilege('authenticated', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'authenticated browser roles cannot call the purge');
select ok(not has_function_privilege('anon', 'public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])', 'EXECUTE'), 'anonymous users cannot call the purge');

create temp table attendance_retention_fixture (
  expired_action_id uuid primary key,
  recent_action_id uuid not null,
  legacy_action_id uuid not null,
  linked_entry_id uuid,
  free_entry_id uuid,
  removed_entry_id uuid,
  team_id uuid
);
grant select, insert, update on attendance_retention_fixture to service_role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-retention-test"}', true);

do $$
declare
  v_expired uuid := '11111111-1111-4111-8111-111111111901';
  v_recent uuid := '11111111-1111-4111-8111-111111111902';
  v_legacy uuid := '11111111-1111-4111-8111-111111111903';
begin
  insert into public.actions(id, created_by_clerk_id, action_date, event_start_time, event_end_time, action_timezone, location_label, status, action_phase)
  values (v_expired, 'attendance-retention-test', '2026-08-25', '09:00', '12:00', 'UTC', 'Expired action', 'approved', 'post_action_complete'),
         (v_recent, 'attendance-retention-test', '2026-08-26', '09:00', '12:00', 'UTC', 'Recent action', 'approved', 'post_action_complete'),
         (v_legacy, 'attendance-retention-test', '2026-08-25', '09:00', null, 'UTC', 'Legacy action without end', 'approved', 'post_action_complete');
  insert into public.action_registrations(action_id, user_id, registration_status)
    values (v_expired, 'attendance-retention-registered-user', 'confirmed');
  insert into public.action_participants(action_id, user_id, participation_status)
    values (v_expired, 'attendance-retention-final-user', 'confirmed');
  insert into public.action_statistical_versions(
    action_id, version_number, source_updated_at, publication_kind, status, action_phase,
    review_state, access_mode, moderation_visibility, data_provenance, action_date,
    location_label, preparation_data
  ) values (
    v_expired, 1, '2026-08-25T12:00:00Z', 'approved_published', 'approved', 'post_action_complete',
    'approved', 'public', 'visible', 'real', '2026-08-25', 'Expired action', '{}'::jsonb
  );
  insert into attendance_retention_fixture(expired_action_id, recent_action_id, legacy_action_id)
    values (v_expired, v_recent, v_legacy);
end $$;

update attendance_retention_fixture set
  linked_entry_id = (select id from public.action_attendance_entries where action_id = expired_action_id and clerk_user_id = 'attendance-retention-registered-user');

insert into attendance_retention_fixture(free_entry_id)
select (public.mutate_action_attendance_entry(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449001', 'add', null, null, '{"display_label":"Nom confidentiel","attendance_status":"unknown"}'::jsonb)->>'id')::uuid
from attendance_retention_fixture;
insert into attendance_retention_fixture(removed_entry_id)
select (public.mutate_action_attendance_entry(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449002', 'add', null, null, '{"display_label":"Identité retirée","attendance_status":"unknown"}'::jsonb)->>'id')::uuid
from attendance_retention_fixture;
select public.mutate_action_attendance_entry(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449003', 'delete', (select removed_entry_id from attendance_retention_fixture), 1, '{}'::jsonb)
from attendance_retention_fixture;
select is((select deleted_at is not null from public.action_attendance_entries where id = (select removed_entry_id from attendance_retention_fixture)), true, 'removing a roster row is logical and leaves the audit available until retention');
select ok(exists (select 1 from public.action_attendance_entry_audit where entry_id = (select removed_entry_id from attendance_retention_fixture) and after_value->>'display_label' = 'Identité retirée'), 'the logical-removal audit retains its reviewed snapshot before expiry');

insert into attendance_retention_fixture(team_id)
select ((public.mutate_action_attendance_team(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449004', 'team_create', null, null, null, '[]'::jsonb, '{"name":"Équipe privée"}'::jsonb)->'teams'->0->'team'->>'id')::uuid)
from attendance_retention_fixture;
select public.mutate_action_attendance_team(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449005', 'member_assign', null, (select free_entry_id from attendance_retention_fixture), (select team_id from attendance_retention_fixture), jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 1)), '{}'::jsonb)
from attendance_retention_fixture;
select public.mutate_action_attendance_team(expired_action_id, 'organizer-a', '44444444-4444-4444-8444-444444449006', 'leader_set', (select team_id from attendance_retention_fixture), null, null, jsonb_build_array(jsonb_build_object('teamId', (select team_id from attendance_retention_fixture), 'revision', 2)), jsonb_build_object('leaderEntryId', (select free_entry_id from attendance_retention_fixture)::text))
from attendance_retention_fixture;

select is((select count(*)::integer from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', true, 100, null)), 1, 'dry-run identifies only the action that reached 90 days');
select is((select outcome from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', true, 100, null) limit 1), 'would_purge', 'dry-run reports the purge without mutating');
select is((select entry_count from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', true, 100, null) limit 1), 3, 'dry-run returns the identity-row count without names');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 3, 'dry-run preserves active and logically removed identities');
select is((select count(*)::integer from public.action_attendance_teams where action_id = (select expired_action_id from attendance_retention_fixture)), 1, 'dry-run preserves teams and composition');
select ok(not exists (select 1 from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', true, 100, null) as p where row_to_json(p)::text like '%Nom confidentiel%' or row_to_json(p)::text like '%Équipe privée%'), 'dry-run output never contains names or team composition');

select is((select outcome from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', false, 100, array[(select expired_action_id from attendance_retention_fixture)]) where action_id = (select expired_action_id from attendance_retention_fixture)), 'purged', 'the explicit dry-run candidate is purged atomically');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes active and logically removed identities');
select is((select count(*)::integer from public.action_attendance_entry_audit where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes nominative before/after snapshots');
select is((select count(*)::integer from public.action_attendance_teams where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes private teams and membership');
select is((select count(*)::integer from public.action_attendance_team_audit where action_id = (select expired_action_id from attendance_retention_fixture)), 0, 'permanent purge removes team names, leaders and composition snapshots');
select is((select outcome from public.purge_expired_action_attendance_data('2026-11-23T12:00:00Z', false, 100, array[(select expired_action_id from attendance_retention_fixture)]) where action_id = (select expired_action_id from attendance_retention_fixture)), 'already_purged', 'replaying the purge is idempotent');
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
