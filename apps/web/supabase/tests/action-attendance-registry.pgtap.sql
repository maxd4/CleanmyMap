begin;
select plan(15);

select ok((select relrowsecurity from pg_class where oid = 'public.action_attendance_entries'::regclass), 'attendance entries keep RLS enabled');
select ok(not has_table_privilege('anon', 'public.action_attendance_entries', 'SELECT'), 'anonymous users cannot read nominative entries');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_entries', 'SELECT'), 'authenticated users cannot read entries directly');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_entries', 'INSERT'), 'authenticated users cannot insert entries directly');
select ok(not has_table_privilege('anon', 'public.action_attendance_entry_audit', 'SELECT'), 'anonymous users cannot read the attendance audit');
select ok(has_table_privilege('service_role', 'public.action_attendance_entries', 'SELECT'), 'the authorized server can read entries');
select ok(has_function_privilege('service_role', 'public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb)', 'EXECUTE'), 'the authorized server can call the mutation RPC');
select ok(not has_function_privilege('authenticated', 'public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb)', 'EXECUTE'), 'browser roles cannot call the mutation RPC');
select ok(exists (select 1 from pg_trigger where tgname = 'action_registrations_attendance_registry_sync'), 'confirmed registrations synchronize into the registry');

create temp table attendance_fixture(action_id uuid primary key);
grant select, insert on attendance_fixture to service_role;
set local role service_role;
do $$
declare
  v_action_id uuid := gen_random_uuid();
begin
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase)
  values (v_action_id, 'attendance-registry-test', current_date + 1, 'Fixture', 'pending', 'pre_action');
  insert into attendance_fixture values (v_action_id);
  insert into public.action_registrations(action_id, user_id, registration_status)
  values (v_action_id, 'clerk_registry_fixture', 'confirmed');
  update public.action_registrations set registration_status = 'cancelled'
  where action_id = v_action_id and user_id = 'clerk_registry_fixture';
  insert into public.action_attendance_entries(action_id, display_label, provenance, created_by, updated_by)
  values (v_action_id, 'Même nom', 'organizer_entry', 'organizer-a', 'organizer-a'),
         (v_action_id, 'Même nom', 'organizer_entry', 'organizer-a', 'organizer-a');
end $$;
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select action_id from attendance_fixture) and clerk_user_id = 'clerk_registry_fixture'), 1, 'a confirmed registration creates one linked stable identity');
select is((select attendance_status from public.action_attendance_entries where action_id = (select action_id from attendance_fixture) and clerk_user_id = 'clerk_registry_fixture'), 'unknown', 'cancelling the registration preserves unknown attendance');
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select action_id from attendance_fixture) and display_label = 'Même nom'), 2, 'homonymous free entries remain distinct');
select is((select count(*)::integer from public.action_attendance_entry_audit where action_id = (select action_id from attendance_fixture) and entry_id in (select id from public.action_attendance_entries where action_id = (select action_id from attendance_fixture) and clerk_user_id = 'clerk_registry_fixture') and operation = 'add' and before_value is null), 1, 'registration synchronization writes a before/after audit event');
select throws_ok(
  format($sql$insert into public.action_attendance_entries(action_id, display_label, clerk_user_id, provenance, created_by, updated_by) values (%L, 'Compte lié', 'clerk_registry_fixture', 'organizer_link', 'organizer-a', 'organizer-a')$sql$, (select action_id from attendance_fixture)),
  '23505', null, 'the same linked account cannot be duplicated for one action'
);
select throws_ok(
  format($sql$select public.mutate_action_attendance_entry(%L, 'organizer-a', %L, 'mark', (select id from public.action_attendance_entries where action_id = %L and display_label = 'Même nom' limit 1), 1, '{"attendance_status":"present"}'::jsonb)$sql$, (select action_id from attendance_fixture), gen_random_uuid(), (select action_id from attendance_fixture)),
  'P0001', null, 'attendance cannot be marked before the effective start'
);
reset role;
select * from finish();
rollback;
