begin;
select plan(19);

select ok((select relrowsecurity from pg_class where oid = 'public.action_form_editors'::regclass), 'form editors keep RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.action_form_editor_audit'::regclass), 'form editor audit keeps RLS enabled');
select ok(not has_table_privilege('anon', 'public.action_form_editors', 'SELECT'), 'anonymous users cannot read form editors');
select ok(not has_table_privilege('authenticated', 'public.action_form_editors', 'SELECT'), 'authenticated users cannot read form editors directly');
select ok(not has_table_privilege('authenticated', 'public.action_form_editor_audit', 'SELECT'), 'authenticated users cannot read editor audit');
select ok(has_table_privilege('service_role', 'public.action_form_editors', 'SELECT'), 'the authorized server can list editors');
select ok(has_function_privilege('service_role', 'public.mutate_action_form_editor(uuid, text, text, text, uuid, text)', 'EXECUTE'), 'the authorized server can call the editor RPC');
select ok(not has_function_privilege('authenticated', 'public.mutate_action_form_editor(uuid, text, text, text, uuid, text)', 'EXECUTE'), 'browser roles cannot call the editor RPC');

create temp table form_editor_fixture(action_id uuid primary key, other_action_id uuid not null);
grant select, insert on form_editor_fixture to service_role;
set local role service_role;
do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_other_action_id uuid := gen_random_uuid();
begin
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase)
  values (v_action_id, 'form-editor-creator', current_date + 1, 'Fixture', 'pending', 'pre_action'),
         (v_other_action_id, 'other-action-creator', current_date + 1, 'Other fixture', 'pending', 'pre_action');
  insert into public.action_organizers(action_id, organizer_clerk_id, organizer_label, is_primary)
  values (v_action_id, 'form-editor-primary', 'Primary', true),
         (v_action_id, 'form-editor-secondary', 'Secondary', false);
  insert into form_editor_fixture values (v_action_id, v_other_action_id);
end $$;

select throws_ok(
  format($sql$select public.mutate_action_form_editor(%L, 'form-editor-secondary', 'benevole', 'user_editor', %L, 'grant')$sql$,
    (select action_id from form_editor_fixture), '44444444-4444-4444-8444-444444444401'),
  '42501', null, 'a secondary organizer cannot grant form editing'
);
select throws_ok(
  format($sql$select public.mutate_action_form_editor(%L, 'form-editor-secondary', null, 'user_editor', %L, 'grant')$sql$,
    (select action_id from form_editor_fixture), '44444444-4444-4444-8444-444444444402'),
  '42501', null, 'a missing active role does not bypass the primary-organizer guard for an outsider'
);
select is(
  public.mutate_action_form_editor((select action_id from form_editor_fixture), 'form-editor-primary', 'benevole', 'user_editor', '44444444-4444-4444-8444-444444444403', 'grant')->>'granted',
  'true', 'the primary organizer can atomically grant form editing'
);
select is((select granted_by_clerk_id from public.action_form_editors where action_id = (select action_id from form_editor_fixture) and clerk_user_id = 'user_editor'), 'form-editor-primary', 'the grant records its actor');
select is(
  public.mutate_action_form_editor((select action_id from form_editor_fixture), 'form-editor-primary', 'benevole', 'user_editor', '44444444-4444-4444-8444-444444444403', 'grant')->>'alreadyProcessed',
  'true', 'replaying an identical grant request is idempotent'
);
select is((select count(*)::integer from public.action_form_editor_audit where action_id = (select action_id from form_editor_fixture)), 1, 'idempotent replay writes only one audit row');
select is(
  public.mutate_action_form_editor((select action_id from form_editor_fixture), 'form-editor-primary', 'benevole', 'user_editor', '44444444-4444-4444-8444-444444444404', 'revoke')->>'granted',
  'false', 'the primary organizer can revoke form editing'
);
select is((select count(*)::integer from public.action_form_editors where action_id = (select action_id from form_editor_fixture) and clerk_user_id = 'user_editor'), 0, 'revocation removes the capability immediately');
select ok(exists (select 1 from public.action_form_editor_audit where action_id = (select action_id from form_editor_fixture) and operation = 'revoke' and before_granted and not after_granted), 'revocation retains a before/after audit record');
select is(
  public.mutate_action_form_editor((select action_id from form_editor_fixture), 'global-admin', 'admin', 'user_admin', '44444444-4444-4444-8444-444444444405', 'grant')->>'granted',
  'true', 'an active global admin can grant form editing'
);
select throws_ok(
  format($sql$select public.mutate_action_form_editor(%L, 'form-editor-primary', 'benevole', 'user_editor', %L, 'grant')$sql$,
    (select other_action_id from form_editor_fixture), '44444444-4444-4444-8444-444444444406'),
  '42501', null, 'a primary organizer of another action cannot grant privileges here'
);
reset role;
select * from finish();
rollback;
