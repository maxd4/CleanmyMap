begin;
select plan(13);

select ok(has_table_privilege('service_role', 'private.external_action_sync_suppression_audit', 'INSERT'), 'service role can persist suppression audit evidence');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_suppression_audit', 'SELECT'), 'authenticated cannot read private suppression audit');
select ok(has_function_privilege('service_role', 'public.reserve_external_action_sync_reference(text,text,text,uuid,text,text,text,text,jsonb,text)', 'EXECUTE'), 'service role can reserve external references');
select ok(not has_function_privilege('authenticated', 'public.reserve_external_action_sync_reference(text,text,text,uuid,text,text,text,text,jsonb,text)', 'EXECUTE'), 'authenticated cannot reserve external references');

create temporary table external_sync_test_results(key text primary key, value text);
grant select, insert on external_sync_test_results to service_role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"external-sync-test"}', true);

do $$
declare
  v_hash text := repeat('a', 64);
  v_bad_hash text := repeat('b', 64);
  v_token uuid := gen_random_uuid();
  v_action uuid := gen_random_uuid();
  v_other_action uuid := gen_random_uuid();
  v_res record;
begin
  insert into public.organizer_directory_entries(id, name, normalized_name, organizer_type, created_by_clerk_id)
  values ('11111111-1111-4111-8111-111111111111', 'Fixture externe', 'fixture externe', 'association', 'fixture');
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase, organizer_type, organizer_id, organizer_name)
  values (v_action, 'fixture', current_date + 1, 'Lieu fixture', 'pending', 'pre_action', 'association', '11111111-1111-4111-8111-111111111111', 'Fixture externe'),
         (v_other_action, 'fixture', current_date + 1, 'Lieu native', 'pending', 'pre_action', 'association', 'native-other', 'Native étrangère');

  perform * from public.claim_external_action_sync_identity(v_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_token);
  select * into v_res from public.reserve_external_action_sync_reference(
    v_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_token,
    'jagis_pour_la_nature', 'event-immutable', 'https://example.test/event', 'r1',
    '{"date":"2027-01-01","route":"A"}', repeat('c', 64));
  insert into external_sync_test_results values ('reservation', v_res.reservation_status);
  insert into external_sync_test_results values ('complete_null', public.complete_external_action_sync_identity(v_hash, v_token, null));
  insert into external_sync_test_results values ('complete_wrong_organizer', public.complete_external_action_sync_identity(v_hash, v_token, v_other_action));
  insert into external_sync_test_results values ('complete_link', public.complete_external_action_sync_identity(v_hash, v_token, v_action));

  select * into v_res from public.reserve_external_action_sync_reference(
    v_bad_hash, '11111111-1111-4111-8111-111111111111', 'fixture', gen_random_uuid(),
    'jagis_pour_la_nature', 'event-immutable', 'https://example.test/event', 'r2',
    '{"date":"2027-01-02","route":"B"}', repeat('d', 64));
  insert into external_sync_test_results values ('changed_source_identity', v_res.identity_hash);
  insert into external_sync_test_results values ('suppression', public.suppress_external_action_sync_action(v_action, 'admin-fixture', 'op-fixture', 'suppression de test'));
  insert into external_sync_test_results values ('native_suppression', public.suppress_external_action_sync_action(v_other_action, 'admin-fixture', 'op-native', 'suppression native'));
  select * into v_res from public.reserve_external_action_sync_reference(
    v_hash, '11111111-1111-4111-8111-111111111111', 'fixture', gen_random_uuid(),
    'fondation_de_la_mer', 'event-second-source', 'https://example.test/event2', 'r1',
    '{"date":"2027-01-01","route":"A"}', repeat('e', 64));
  insert into external_sync_test_results values ('same_identity_tombstone', v_res.reservation_status);
end $$;

select is((select value from external_sync_test_results where key = 'reservation'), 'reserved', 'external identity is reserved before canonical creation');
select is((select value from external_sync_test_results where key = 'complete_null'), 'invalid_action', 'completion rejects a null canonical action');
select is((select value from external_sync_test_results where key = 'complete_wrong_organizer'), 'organizer_mismatch', 'completion rejects an action owned by another organizer');
select is((select value from external_sync_test_results where key = 'complete_link'), 'linked', 'completion links the canonical action after validation');
select is((select value from external_sync_test_results where key = 'changed_source_identity'), repeat('a', 64), 'source event identity survives date and route revision');
select is((select value from external_sync_test_results where key = 'suppression'), 'suppressed', 'administrative suppression creates a tombstone');
select is((select value from external_sync_test_results where key = 'native_suppression'), 'not_synced', 'native foreign actions cannot be suppressed by external synchronization');
select is((select value from external_sync_test_results where key = 'same_identity_tombstone'), 'suppressed', 'tombstone prevents another source from reactivating the identity');
select is((select count(*)::integer from private.external_action_sync_suppression_audit where operation_id = 'op-fixture'), 1, 'suppression audit evidence is persisted transactionally');

select * from finish();
rollback;
