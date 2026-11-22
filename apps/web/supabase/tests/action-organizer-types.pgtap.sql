begin;
select plan(10);

select ok((select relrowsecurity from pg_class where oid = 'public.organizer_directory_entries'::regclass), 'organizer directory keeps RLS enabled');
select ok(has_table_privilege('service_role', 'public.organizer_directory_entries', 'INSERT'), 'service role keeps explicit directory writes');
select ok(not has_table_privilege('authenticated', 'public.organizer_directory_entries', 'INSERT'), 'authenticated users cannot create directory entries directly');

create temp table organizer_type_fixture(action_id uuid primary key);
grant select, insert on organizer_type_fixture to service_role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"organizer-type-test"}', true);
do $$
declare
  action_id uuid := gen_random_uuid();
begin
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase, organizer_type, organizer_id, organizer_name, preparation_data)
  values (action_id, 'organizer-test', current_date + 1, 'Fixture', 'pending', 'pre_action', 'school', null, 'Université Exemple', '{"organizationalRelations":{"initiator":{"kind":"organizer"},"partners":[{"organizerType":"local_authority","name":"Ville Exemple","role":"participants"}],"participantOrigins":[{"category":"Université"}]}}');
  insert into organizer_type_fixture values (action_id);
end $$;
select is((select organizer_type from public.actions where id = (select action_id from organizer_type_fixture)), 'school', 'school organizer type persists with a declarative name and no directory id');
select is((select organizer_id from public.actions where id = (select action_id from organizer_type_fixture)), null, 'declarative organizer name does not require a canonical directory entry');
select is((select preparation_data #>> '{organizationalRelations,partners,0,role}' from public.actions where id = (select action_id from organizer_type_fixture)), 'participants', 'organizational relations persist in preparation_data');
select throws_ok($$insert into public.actions(id, created_by_clerk_id, action_date, location_label, organizer_type) values (gen_random_uuid(), 'organizer-test', current_date, 'Invalid', 'school_context')$$, '23514', null, 'unknown organizer type is rejected');
select throws_ok($$insert into public.organizer_directory_entries(id, name, normalized_name, organizer_type, created_by_clerk_id) values (gen_random_uuid(), 'Invalid', 'invalid', 'school_context', 'organizer-test')$$, '23514', null, 'unknown directory organizer type is rejected');
select is((select count(*)::integer from pg_constraint where conrelid = 'public.actions'::regclass and conname = 'actions_organizer_type_check' and pg_get_constraintdef(oid) like '%school%' and pg_get_constraintdef(oid) like '%local_authority%'), 1, 'actions constraint includes both new types');
select is((select count(*)::integer from pg_constraint where conrelid = 'public.organizer_directory_entries'::regclass and conname = 'organizer_directory_entries_organizer_type_check' and pg_get_constraintdef(oid) like '%school%' and pg_get_constraintdef(oid) like '%local_authority%'), 1, 'directory constraint includes both new types');
reset role;
select * from finish();
rollback;
