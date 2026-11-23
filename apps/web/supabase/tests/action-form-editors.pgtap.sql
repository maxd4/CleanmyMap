begin;
select plan(22);

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
select set_config('request.jwt.claims', '{"role":"service_role","sub":"form-editors-test"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
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

create temp table restored_action_fixture(action_id uuid primary key);
grant select, insert on restored_action_fixture to service_role;
insert into restored_action_fixture values ('55555555-5555-4555-8555-555555555501');
select ok(
  (public.restore_action_backup_with_form_editors(jsonb_build_object(
    'format', 'cleanmymap.action-backup',
    'version', 2,
    'tables', jsonb_build_object(
      'actions', jsonb_build_array(jsonb_build_object(
        'id', (select action_id from restored_action_fixture),
        'created_at', '2026-11-23T10:00:00Z',
        'updated_at', '2026-11-23T10:00:00Z',
        'created_by_clerk_id', 'backup-restore-owner',
        'action_date', '2026-11-24',
        'location_label', 'Backup fixture',
        'duration_minutes', 30,
        'status', 'pending',
        'action_phase', 'pre_action',
        'preparation_data', '{}'::jsonb
      )),
      'action_organizers', '[]'::jsonb,
      'action_registrations', '[]'::jsonb,
      'action_participants', '[]'::jsonb,
      'training_examples', '[]'::jsonb,
      'forms', '[]'::jsonb,
      'action_conversations', '[]'::jsonb,
      'action_conversation_members', '[]'::jsonb,
      'action_conversation_exclusions', '[]'::jsonb,
      'action_share_contact_requests', '[]'::jsonb,
      'action_form_editors', jsonb_build_array(jsonb_build_object(
        'action_id', (select action_id from restored_action_fixture),
        'clerk_user_id', 'backup-restored-editor',
        'granted_by_clerk_id', 'backup-restore-owner',
        'granted_at', '2026-11-23T10:00:00Z'
      )),
      'action_form_editor_audit', jsonb_build_array(jsonb_build_object(
        'action_id', (select action_id from restored_action_fixture),
        'request_id', '55555555-5555-4555-8555-555555555502',
        'actor_clerk_id', 'backup-restore-owner',
        'target_clerk_id', 'backup-restored-editor',
        'operation', 'grant',
        'before_granted', false,
        'after_granted', true,
        'created_at', '2026-11-23T10:00:00Z'
      ))
    ),
    'fieldRoleTables', jsonb_build_object(
      'action_field_role_assignments', '[]'::jsonb,
      'action_field_role_transfer_proposals', '[]'::jsonb,
      'action_field_role_transfer_audit', '[]'::jsonb
    )
  ))) ? 'restored', 'restore RPC accepts the version-2 editor contract with field-role relations');
select is(
  (select count(*)::integer from public.action_form_editors
    where action_id = (select action_id from restored_action_fixture)
      and clerk_user_id = 'backup-restored-editor'),
  1, 'action backup restoration retains the delegated editor relation'
);
select is(
  (select count(*)::integer from public.action_form_editor_audit
    where action_id = (select action_id from restored_action_fixture)
      and request_id = '55555555-5555-4555-8555-555555555502'),
  1, 'action backup restoration retains the editor audit record'
);
reset role;
select * from finish();
rollback;
