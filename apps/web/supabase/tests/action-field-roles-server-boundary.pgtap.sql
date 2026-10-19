begin;

select plan(13);

select ok(not has_table_privilege('anon', 'public.action_field_role_assignments', 'SELECT'), 'anon cannot read field-role assignments directly');
select ok(not has_table_privilege('authenticated', 'public.action_field_role_assignments', 'SELECT'), 'authenticated cannot read field-role assignments directly');
select ok(not has_table_privilege('authenticated', 'public.action_field_role_assignments', 'INSERT'), 'authenticated cannot insert field-role assignments directly');
select ok(not has_table_privilege('authenticated', 'public.action_field_role_transfer_proposals', 'UPDATE'), 'authenticated cannot mutate transfer proposals directly');
select ok(not has_table_privilege('authenticated', 'public.action_field_role_transfer_audit', 'SELECT'), 'authenticated cannot read the transfer audit directly');
select ok(has_table_privilege('service_role', 'public.action_field_role_assignments', 'SELECT'), 'service_role can read field-role assignments');
select ok(has_function_privilege('service_role', 'public.assign_action_field_roles(uuid, text, text[], text)', 'EXECUTE'), 'service_role can execute the role replacement RPC');
select ok(not has_function_privilege('authenticated', 'public.assign_action_field_roles(uuid, text, text[], text)', 'EXECUTE'), 'authenticated cannot execute the role replacement RPC');
select ok(has_function_privilege('service_role', 'public.propose_action_field_role_transfer(uuid, text, text, boolean)', 'EXECUTE'), 'service_role can propose a primary transfer');
select ok(not has_function_privilege('authenticated', 'public.propose_action_field_role_transfer(uuid, text, text, boolean)', 'EXECUTE'), 'authenticated cannot propose a primary transfer directly');
select ok(has_function_privilege('service_role', 'public.respond_action_field_role_transfer(uuid, text, text, boolean, text)', 'EXECUTE'), 'service_role can respond to a primary transfer');
select ok(not has_function_privilege('authenticated', 'public.respond_action_field_role_transfer(uuid, text, text, boolean, text)', 'EXECUTE'), 'authenticated cannot respond to a primary transfer directly');
select ok(exists (select 1 from pg_class where relname = 'action_field_role_transfer_audit' and relrowsecurity), 'transfer audit has RLS enabled');

select * from finish();
rollback;
