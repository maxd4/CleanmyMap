begin;
select plan(40);

select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_teams'::regclass), 'action attendance teams keep RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_team_members'::regclass), 'team membership keeps RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_team_audit'::regclass), 'team audit keeps RLS enabled');
select ok(not has_table_privilege('anon', 'public.action_attendance_teams', 'SELECT'), 'anonymous users cannot read private teams');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_teams', 'SELECT'), 'authenticated users cannot read private teams directly');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_team_members', 'INSERT'), 'browser users cannot assign team members directly');
select ok(has_table_privilege('service_role', 'public.action_attendance_teams', 'SELECT'), 'the authorized server can read teams');
select ok(not has_table_privilege('service_role', 'public.action_attendance_teams', 'INSERT'), 'team writes are restricted to the invariant-enforcing RPC');
select ok(not has_table_privilege('service_role', 'public.action_attendance_team_members', 'UPDATE'), 'membership changes cannot bypass atomic leader handling');
select ok(not has_table_privilege('service_role', 'public.action_attendance_team_audit', 'INSERT'), 'audit rows cannot be forged through direct server writes');
select ok(has_function_privilege('service_role', 'public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb)', 'EXECUTE'), 'the authorized server can call the team RPC');
select ok(not has_function_privilege('authenticated', 'public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb)', 'EXECUTE'), 'browser roles cannot call the team RPC');

create temp table attendance_team_fixture (
  action_id uuid primary key,
  other_action_id uuid not null,
  entry_a uuid not null,
  entry_b uuid not null,
  entry_c uuid not null,
  outside_entry uuid not null,
  other_action_entry uuid not null,
  team_a uuid,
  team_b uuid
);
grant select, insert, update on attendance_team_fixture to service_role;
set local role service_role;
do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_other_action_id uuid := gen_random_uuid();
  v_entry_a uuid := gen_random_uuid();
  v_entry_b uuid := gen_random_uuid();
  v_entry_c uuid := gen_random_uuid();
  v_outside_entry uuid := gen_random_uuid();
  v_other_action_entry uuid := gen_random_uuid();
begin
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase)
  values (v_action_id, 'attendance-team-test', current_date + 1, 'Fixture', 'pending', 'pre_action'),
         (v_other_action_id, 'attendance-team-test', current_date + 1, 'Other fixture', 'pending', 'pre_action');
  insert into public.action_attendance_entries(id, action_id, display_label, provenance, created_by, updated_by)
  values (v_entry_a, v_action_id, 'Même nom', 'organizer_entry', 'organizer-a', 'organizer-a'),
         (v_entry_b, v_action_id, 'Même nom', 'organizer_entry', 'organizer-a', 'organizer-a'),
         (v_entry_c, v_action_id, 'Entrée ordinaire', 'organizer_entry', 'organizer-a', 'organizer-a'),
         (v_outside_entry, v_action_id, 'Sans équipe', 'organizer_entry', 'organizer-a', 'organizer-a'),
         (v_other_action_entry, v_other_action_id, 'Même nom', 'organizer_entry', 'organizer-a', 'organizer-a');
  insert into attendance_team_fixture(action_id, other_action_id, entry_a, entry_b, entry_c, outside_entry, other_action_entry)
  values (v_action_id, v_other_action_id, v_entry_a, v_entry_b, v_entry_c, v_outside_entry, v_other_action_entry);
end $$;

update attendance_team_fixture as fixture
set team_a = ((public.mutate_action_attendance_team(fixture.action_id, 'organizer-a', '44444444-4444-4444-8444-444444444401', 'team_create', null, null, null, '[]'::jsonb, '{"name":"Équipe A"}'::jsonb)
  -> 'teams' -> 0 -> 'team' ->> 'id')::uuid);
update attendance_team_fixture as fixture
set team_b = ((public.mutate_action_attendance_team(fixture.action_id, 'organizer-a', '44444444-4444-4444-8444-444444444402', 'team_create', null, null, null, '[]'::jsonb, '{"name":"Équipe B"}'::jsonb)
  -> 'teams' -> 0 -> 'team' ->> 'id')::uuid);
select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444401', 'team_create', null, null, null, '[]'::jsonb, '{"name":"Équipe A"}'::jsonb) from attendance_team_fixture;
select is((select name from public.action_attendance_teams where id = (select team_a from attendance_team_fixture)), 'Équipe A', 'team names are stored normalized and trimmed');
select is((select count(*)::integer from public.action_attendance_team_audit where action_id = (select action_id from attendance_team_fixture) and request_id = '44444444-4444-4444-8444-444444444401'), 1, 'team creation replay is idempotently audited once');
select is((select count(*)::integer from public.action_attendance_teams where action_id = (select action_id from attendance_team_fixture) and normalized_name = 'équipe a'), 1, 'idempotent replay does not create a duplicate team');

select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444403', 'member_assign', null, entry_a, team_a, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 1)), '{}'::jsonb) from attendance_team_fixture;
select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444404', 'member_assign', null, entry_b, team_a, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 2)), '{}'::jsonb) from attendance_team_fixture;
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and team_id = (select team_a from attendance_team_fixture)), 2, 'homonymous stable entries can both be assigned');
select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444415', 'member_assign', null, entry_c, team_a, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 3)), '{}'::jsonb) from attendance_team_fixture;
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and team_id = (select team_a from attendance_team_fixture)), 3, 'ordinary fixture member is assigned to the same team');
select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444405', 'leader_set', team_a, null, null, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 4)), jsonb_build_object('leaderEntryId', entry_a::text)) from attendance_team_fixture;
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'leader_set', %L, null, null, %L::jsonb, %L::jsonb)$sql$,
    (select action_id from attendance_team_fixture), '44444444-4444-4444-8444-444444444406', (select team_a from attendance_team_fixture),
    jsonb_build_array(jsonb_build_object('teamId', (select team_a from attendance_team_fixture), 'revision', 5)),
    jsonb_build_object('leaderEntryId', (select outside_entry::text from attendance_team_fixture))),
  '22023', null, 'a leader outside the team is rejected');
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'member_assign', null, %L, %L, %L::jsonb, '{}'::jsonb)$sql$,
    (select action_id from attendance_team_fixture), '44444444-4444-4444-8444-444444444407', (select other_action_entry from attendance_team_fixture), (select team_a from attendance_team_fixture),
    jsonb_build_array(jsonb_build_object('teamId', (select team_a from attendance_team_fixture), 'revision', 5))),
  'P0002', null, 'an entry from another action cannot be assigned');

select lives_ok(
  format($sql$select public.mutate_action_attendance_entry(%L, 'organizer-a', %L, 'delete', %L, 1, '{}'::jsonb)$sql$,
    (select action_id from attendance_team_fixture), '44444444-4444-4444-8444-444444444408', (select entry_c from attendance_team_fixture)),
  'removing an ordinary team member is atomic with its detachment');
select is((select leader_entry_id from public.action_attendance_teams where id = (select team_a from attendance_team_fixture)), (select entry_a from attendance_team_fixture), 'removing an ordinary member preserves the assigned leader');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select action_id from attendance_team_fixture) and id = (select entry_c from attendance_team_fixture) and deleted_at is not null), 1, 'ordinary member removal retains its soft-deleted attendance entry');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_c from attendance_team_fixture)), 0, 'ordinary member removal detaches only that entry');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_b from attendance_team_fixture) and team_id = (select team_a from attendance_team_fixture)), 1, 'other team members remain assigned');
select ok(exists (
  select 1 from public.action_attendance_team_audit audit
  where audit.action_id = (select action_id from attendance_team_fixture)
    and audit.operation = 'member_removed_with_entry'
    and audit.before_value->0->'team'->>'leader_entry_id' = (select entry_a::text from attendance_team_fixture)
    and jsonb_array_length(audit.before_value->0->'member_entry_ids') = 3
    and audit.after_value->0->'team'->>'leader_entry_id' = (select entry_a::text from attendance_team_fixture)
    and jsonb_array_length(audit.after_value->0->'member_entry_ids') = 2
), 'ordinary member removal audit snapshots preserve the leader and remaining composition');

select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444409', 'member_assign', null, entry_a, team_b, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 6), jsonb_build_object('teamId', team_b, 'revision', 1)), '{}'::jsonb) from attendance_team_fixture;
select is((select leader_entry_id from public.action_attendance_teams where id = (select team_a from attendance_team_fixture)), null::uuid, 'moving the leader explicitly clears the previous team designation');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_a from attendance_team_fixture) and team_id = (select team_b from attendance_team_fixture)), 1, 'moving a member preserves its stable attendance entry');
select throws_ok(
  format($sql$select public.mutate_action_attendance_team(%L, 'organizer-a', %L, 'team_rename', %L, null, null, %L::jsonb, '{"name":"  Équipe   A "}'::jsonb)$sql$,
    (select action_id from attendance_team_fixture), '44444444-4444-4444-8444-444444444410', (select team_b from attendance_team_fixture),
    jsonb_build_array(jsonb_build_object('teamId', (select team_b from attendance_team_fixture), 'revision', 2))),
  '23505', null, 'normalized duplicate names within an action are rejected');

select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444411', 'leader_set', team_b, null, null, jsonb_build_array(jsonb_build_object('teamId', team_b, 'revision', 2)), jsonb_build_object('leaderEntryId', entry_a::text)) from attendance_team_fixture;
select lives_ok(
  format($sql$select public.mutate_action_attendance_entry(%L, 'organizer-a', %L, 'delete', %L, 1, '{}'::jsonb)$sql$,
    (select action_id from attendance_team_fixture), '44444444-4444-4444-8444-444444444412', (select entry_a from attendance_team_fixture)),
  'removing a team leader entry is atomic with team detachment');
select is((select leader_entry_id from public.action_attendance_teams where id = (select team_b from attendance_team_fixture)), null::uuid, 'entry deletion explicitly releases the leader designation');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_a from attendance_team_fixture)), 0, 'deleted attendance entry is detached without dissolving its team');
select is((select count(*)::integer from public.action_attendance_teams where id = (select team_b from attendance_team_fixture)), 1, 'entry removal leaves its team intact');
select ok(exists (
  select 1 from public.action_attendance_team_audit audit
  where audit.action_id = (select action_id from attendance_team_fixture)
    and audit.operation = 'member_removed_with_entry'
    and audit.before_value->0->'team'->>'leader_entry_id' = (select entry_a::text from attendance_team_fixture)
    and audit.after_value->0->'team'->>'leader_entry_id' is null
    and jsonb_array_length(audit.before_value->0->'member_entry_ids') = 1
    and jsonb_array_length(audit.after_value->0->'member_entry_ids') = 0
), 'leader removal audit snapshots record release without deleting the team');

select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444413', 'member_assign', null, entry_b, null, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 7)), '{}'::jsonb) from attendance_team_fixture;
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_b from attendance_team_fixture)), 0, 'explicit member removal frees the active entry');
select is((select count(*)::integer from public.action_attendance_teams where id = (select team_a from attendance_team_fixture)), 1, 'removing the last member does not dissolve the team');
select public.mutate_action_attendance_team(action_id, 'organizer-a', '44444444-4444-4444-8444-444444444414', 'team_delete', team_a, null, null, jsonb_build_array(jsonb_build_object('teamId', team_a, 'revision', 8)), '{}'::jsonb) from attendance_team_fixture;
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select action_id from attendance_team_fixture) and id = (select entry_b from attendance_team_fixture) and deleted_at is null), 1, 'deleting a team preserves active attendance entries');
select is((select count(*)::integer from public.action_attendance_team_members where action_id = (select action_id from attendance_team_fixture) and entry_id = (select entry_b from attendance_team_fixture)), 0, 'deleting a team makes its active members unassigned');
select is((select count(*)::integer from public.action_participants where action_id = (select action_id from attendance_team_fixture)), 0, 'team operations do not create final participation records');
select ok(exists (select 1 from public.action_attendance_team_audit where action_id = (select action_id from attendance_team_fixture) and operation = 'member_assign' and before_value is not null and after_value is not null), 'team membership changes retain before/after audit snapshots');
select ok(exists (select 1 from public.action_attendance_team_audit where action_id = (select action_id from attendance_team_fixture) and operation = 'member_removed_with_entry'), 'entry removal from an assigned team is audited');

reset role;
select * from finish();
rollback;
