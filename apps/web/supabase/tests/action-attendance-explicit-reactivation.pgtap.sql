begin;
select plan(27);

select ok(
  exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and indexname = 'action_attendance_entries_action_clerk_unique'
       and indexdef ilike '%where ((clerk_user_id is not null) and (deleted_at is null))%'
  ),
  'linked account uniqueness applies only to active registry entries'
);
select ok(not has_table_privilege('anon', 'public.action_attendance_entries', 'SELECT'), 'anonymous clients cannot read roster identities');
select ok(not has_table_privilege('authenticated', 'public.action_attendance_entries', 'SELECT'), 'authenticated clients cannot read roster identities directly');

create temp table attendance_reactivation_fixture (
  action_id uuid primary key,
  entry_id uuid,
  restore_request_id uuid not null
);
grant select, insert, update on attendance_reactivation_fixture to service_role;
set local role service_role;

do $$
declare
  v_action_id uuid := gen_random_uuid();
begin
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase)
  values (v_action_id, 'attendance-reactivation-test', current_date + 1, 'Fixture', 'pending', 'pre_action');
  insert into attendance_reactivation_fixture(action_id, restore_request_id)
  values (v_action_id, '44444444-4444-4444-8444-444444449106');
  insert into public.action_registrations(action_id, user_id, registration_status)
  values (v_action_id, 'attendance-reactivation-member', 'confirmed');
end $$;

update attendance_reactivation_fixture f
   set entry_id = e.id
  from public.action_attendance_entries e
 where e.action_id = f.action_id and e.clerk_user_id = 'attendance-reactivation-member';

select is((select count(*)::integer from public.action_attendance_entries e where e.action_id = (select action_id from attendance_reactivation_fixture) and e.clerk_user_id = 'attendance-reactivation-member'), 1, 'confirmed registration creates one stable linked identity');
select is((select attendance_status from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 'unknown', 'confirmed registration starts with unknown attendance');
select is((select count(*)::integer from public.action_attendance_entry_audit where entry_id = (select entry_id from attendance_reactivation_fixture)), 1, 'registration creation has one initial audit event');

select public.mutate_action_attendance_entry(
  (select action_id from attendance_reactivation_fixture), 'attendance-reactivation-organizer',
  '44444444-4444-4444-8444-444444449101', 'delete',
  (select entry_id from attendance_reactivation_fixture), 1, '{}'::jsonb
);
select is((select deleted_at is not null from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), true, 'removal remains a logical deletion');
select is((select revision from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 2, 'logical deletion increments the revision');

update public.action_registrations
   set registration_status = 'pending'
 where action_id = (select action_id from attendance_reactivation_fixture)
   and user_id = 'attendance-reactivation-member';
update public.action_registrations
   set registration_status = 'confirmed'
 where action_id = (select action_id from attendance_reactivation_fixture)
   and user_id = 'attendance-reactivation-member';
select is((select count(*)::integer from public.action_attendance_entries e where e.action_id = (select action_id from attendance_reactivation_fixture) and e.clerk_user_id = 'attendance-reactivation-member'), 1, 'registration synchronization never creates a second row after an explicit removal');
select is((select deleted_at is not null from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), true, 'registration synchronization does not resurrect the removed entry');

select public.mutate_action_attendance_entry(
  (select action_id from attendance_reactivation_fixture), 'attendance-reactivation-organizer',
  (select restore_request_id from attendance_reactivation_fixture), 'add', null, null,
  '{"display_label":"Compte lié restauré","clerk_user_id":"attendance-reactivation-member","attendance_status":"unknown"}'::jsonb
);
select is((select id from public.action_attendance_entries where action_id = (select action_id from attendance_reactivation_fixture) and clerk_user_id = 'attendance-reactivation-member'), (select entry_id from attendance_reactivation_fixture), 'explicit add reuses the stable row ID');
select ok((select deleted_at is null and deleted_by is null from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 'explicit add restores an active row and clears deletion metadata');
select ok((select attendance_status = 'unknown' and observed_at is null from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 'restored attendance is unknown with no fabricated observation');
select is((select revision from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 3, 'restoration increments the revision');
select is((select provenance from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 'organizer_link', 'explicit re-add retains linked-account provenance');
select is((select created_by from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 'system:confirmed-registration', 'restoration preserves the original creator');
select ok(exists (
  select 1 from public.action_attendance_entry_audit a
   where a.action_id = (select action_id from attendance_reactivation_fixture)
     and a.request_id = (select restore_request_id from attendance_reactivation_fixture)
     and a.operation = 'add'
     and a.before_value->>'deleted_at' is not null
     and a.after_value->>'deleted_at' is null
     and a.before_value->>'id' = a.after_value->>'id'
), 'restoration audit records the deleted before-state and active after-state');
select is((select count(*)::integer from public.action_attendance_entry_audit where entry_id = (select entry_id from attendance_reactivation_fixture)), 3, 'initial sync, removal, and restoration each have one audit event');

select is((public.mutate_action_attendance_entry(
  (select action_id from attendance_reactivation_fixture), 'attendance-reactivation-organizer',
  (select restore_request_id from attendance_reactivation_fixture), 'add', null, null,
  '{"display_label":"Compte lié restauré","clerk_user_id":"attendance-reactivation-member","attendance_status":"unknown"}'::jsonb
)->>'id')::uuid, (select entry_id from attendance_reactivation_fixture), 'retry returns the canonical restored identity');
select is((select revision from public.action_attendance_entries where id = (select entry_id from attendance_reactivation_fixture)), 3, 'retry does not increment the revision twice');
select is((select count(*)::integer from public.action_attendance_entry_audit where entry_id = (select entry_id from attendance_reactivation_fixture)), 3, 'retry does not add a duplicate audit event');
select throws_ok(
  format($sql$insert into public.action_attendance_entries(action_id, display_label, clerk_user_id, provenance, created_by, updated_by) values (%L, 'Compte lié doublon', 'attendance-reactivation-member', 'organizer_link', 'attendance-reactivation-organizer', 'attendance-reactivation-organizer')$sql$, (select action_id from attendance_reactivation_fixture)),
  '23505', null, 'a second active row for the same linked account is rejected'
);

select public.mutate_action_attendance_entry(
  (select action_id from attendance_reactivation_fixture), 'attendance-reactivation-organizer',
  '44444444-4444-4444-8444-444444449102', 'add', null, null,
  '{"display_label":"Même nom","attendance_status":"unknown"}'::jsonb
);
select public.mutate_action_attendance_entry(
  (select action_id from attendance_reactivation_fixture), 'attendance-reactivation-organizer',
  '44444444-4444-4444-8444-444444449103', 'add', null, null,
  '{"display_label":"Même nom","attendance_status":"unknown"}'::jsonb
);
select is((select count(*)::integer from public.action_attendance_entries where action_id = (select action_id from attendance_reactivation_fixture) and display_label = 'Même nom' and clerk_user_id is null and deleted_at is null), 2, 'homonymous unlinked rows remain distinct');
select is((select count(*)::integer from public.action_participants where action_id = (select action_id from attendance_reactivation_fixture)), 0, 'registry restoration does not create final participation');
select is((select count(*)::integer from public.progression_events where source_id = (select action_id::text from attendance_reactivation_fixture)), 0, 'registry restoration does not create progression events');
select is((select count(*)::integer from public.xp_audit where source_id = (select action_id::text from attendance_reactivation_fixture)), 0, 'registry restoration does not create XP audit rows');
select is((select count(*)::integer from public.action_statistical_versions where action_id = (select action_id from attendance_reactivation_fixture)), 0, 'registry restoration does not publish a statistical action version');

reset role;
select * from finish();
rollback;
