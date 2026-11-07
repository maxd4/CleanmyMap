begin;

select plan(10);

select has_function('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], 'organizer regulation configuration overload exists');
select function_privs_are('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], array['service_role'], 'configuration RPC is service-only');
select function_privs_are('public', 'spogomi_update_division_regulation', array['uuid','uuid','bigint','text','text','text','text','jsonb','jsonb','jsonb','jsonb'], array[]::text[], 'configuration RPC is not callable by public roles');
select has_function('public', 'spogomi_division_regulation_is_complete', array['uuid','uuid','text'], 'certification completeness helper exists');
select has_column('public', 'spogomi_category_rules', 'division_id', 'categories are division-scoped');
select has_column('public', 'spogomi_environment_category_mappings', 'division_id', 'mappings are division-scoped');
select has_column('public', 'spogomi_result_submissions', 'division_id', 'submissions are division-scoped');
select ok(position('for update' in lower(pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure))) > 0, 'configuration locks the event and division');
select ok(position('composition_revision + 1' in pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure)) > 0, 'successful configuration advances the revision');
select ok(position('spogomi_result_submissions' in pg_get_functiondef('public.spogomi_update_division_regulation(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure)) > 0, 'existing submissions are protected');

select * from finish();
rollback;
