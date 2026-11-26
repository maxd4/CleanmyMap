begin;
select plan(27);

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
  v_unlinked_hash text := repeat('f', 64);
  v_second_action_hash text := repeat('1', 64);
  v_token uuid := gen_random_uuid();
  v_unlinked_token uuid := gen_random_uuid();
  v_takeover_token uuid := gen_random_uuid();
  v_action uuid := gen_random_uuid();
  v_second_action uuid := gen_random_uuid();
  v_other_action uuid := gen_random_uuid();
  v_res record;
  v_claim record;
begin
  insert into public.organizer_directory_entries(id, name, normalized_name, organizer_type, created_by_clerk_id)
  values ('11111111-1111-4111-8111-111111111111', 'Fixture externe', 'fixture externe', 'association', 'fixture'),
         ('22222222-2222-4222-8222-222222222222', 'Autre organisateur', 'autre organisateur', 'association', 'fixture');
  insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase, organizer_type, organizer_id, organizer_name)
  values (v_action, 'fixture', current_date + 1, 'Lieu fixture', 'pending', 'pre_action', 'association', '11111111-1111-4111-8111-111111111111', 'Fixture externe'),
         (v_second_action, 'fixture', current_date + 2, 'Lieu fixture 2', 'pending', 'pre_action', 'association', '11111111-1111-4111-8111-111111111111', 'Fixture externe'),
         (v_other_action, 'fixture', current_date + 1, 'Lieu native', 'pending', 'pre_action', 'association', 'native-other', 'Native étrangère');

  -- 1. Unlinked reservation ownership, busy, expired identical token, and takeover
  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_unlinked_token,
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/unlinked', 'r1',
    '{"date":"2027-02-01","route":"U1"}', repeat('2', 64));
  insert into external_sync_test_results values ('unlinked_reserved', v_res.reservation_status);

  -- Different organizer cannot hijack or mutate an unlinked reference
  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '22222222-2222-4222-8222-222222222222', 'foreign', gen_random_uuid(),
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/hijack', 'r99',
    '{"date":"2027-02-09","route":"H"}', repeat('3', 64));
  insert into external_sync_test_results values ('unlinked_foreign_owner', v_res.reservation_status);

  -- Different token while lease is active gets busy without mutating snapshot
  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', gen_random_uuid(),
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/busy', 'r98',
    '{"date":"2027-02-08","route":"B"}', repeat('4', 64));
  insert into external_sync_test_results values ('unlinked_busy', v_res.reservation_status);
  insert into external_sync_test_results values (
    'unlinked_snapshot_preserved',
    (select external_revision from private.external_action_sync_references where source_id = 'jagis_pour_la_nature' and external_event_id = 'event-unlinked')
  );

  -- Expire the lease and verify identical expired token is rejected by both claim and reserve
  update private.external_action_sync_identities
     set claim_expires_at = now() - interval '1 minute'
   where identity_hash = v_unlinked_hash;

  select * into v_claim from public.claim_external_action_sync_identity(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_unlinked_token
  );
  insert into external_sync_test_results values ('claim_expired_same_token', v_claim.claim_status);

  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_unlinked_token,
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/expired', 'r2',
    '{"date":"2027-02-02","route":"E"}', repeat('5', 64));
  insert into external_sync_test_results values ('reserve_expired_same_token', v_res.reservation_status);

  -- Fresh token can take over the expired unlinked lease
  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_takeover_token,
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/takeover', 'r3',
    '{"date":"2027-02-03","route":"T"}', repeat('6', 64));
  insert into external_sync_test_results values ('reserve_expired_takeover', v_res.reservation_status);

  -- Lease that expires mid-transaction (now() still < claim_expires_at, clock_timestamp() > claim_expires_at)
  update private.external_action_sync_identities
     set claim_expires_at = clock_timestamp() + interval '0.1 seconds'
   where identity_hash = v_unlinked_hash;
  perform pg_sleep(0.15);

  select * into v_claim from public.claim_external_action_sync_identity(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_takeover_token
  );
  insert into external_sync_test_results values ('claim_midtx_expired', v_claim.claim_status);

  select * into v_res from public.reserve_external_action_sync_reference(
    v_unlinked_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_takeover_token,
    'jagis_pour_la_nature', 'event-unlinked', 'https://example.test/midtx', 'r4',
    '{"date":"2027-02-04","route":"M"}', repeat('6', 64));
  insert into external_sync_test_results values ('reserve_midtx_expired', v_res.reservation_status);

  insert into external_sync_test_results values (
    'complete_midtx_expired',
    public.complete_external_action_sync_identity(v_unlinked_hash, v_takeover_token, v_action)
  );

  -- 2. Linked lifecycle, revision survival, suppression idempotency & operation_id collision
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

  -- Prepare a second synced action to test operation_id collision
  perform * from public.reserve_external_action_sync_reference(
    v_second_action_hash, '11111111-1111-4111-8111-111111111111', 'fixture', v_token,
    'fondation_de_la_mer', 'event-second-action', 'https://example.test/second', 'r1',
    '{"date":"2027-03-01","route":"S"}', repeat('7', 64));
  perform public.complete_external_action_sync_identity(v_second_action_hash, v_token, v_second_action);

  insert into external_sync_test_results values ('suppression', public.suppress_external_action_sync_action(v_action, 'admin-fixture', 'op-fixture', 'suppression de test'));
  insert into external_sync_test_results values ('suppression_idempotent_replay', public.suppress_external_action_sync_action(v_action, 'admin-fixture', 'op-fixture', 'suppression de test'));
  insert into external_sync_test_results values ('suppression_op_collision', public.suppress_external_action_sync_action(v_second_action, 'admin-fixture', 'op-fixture', 'collision operation'));
  insert into external_sync_test_results values (
    'second_action_not_suppressed',
    (select case when suppressed_at is null then 'active' else 'suppressed' end from private.external_action_sync_identities where action_id = v_second_action)
  );
  insert into external_sync_test_results values ('native_suppression', public.suppress_external_action_sync_action(v_other_action, 'admin-fixture', 'op-native', 'suppression native'));

  select * into v_res from public.reserve_external_action_sync_reference(
    v_hash, '11111111-1111-4111-8111-111111111111', 'fixture', gen_random_uuid(),
    'fondation_de_la_mer', 'event-second-source', 'https://example.test/event2', 'r1',
    '{"date":"2027-01-01","route":"A"}', repeat('e', 64));
  insert into external_sync_test_results values ('same_identity_tombstone', v_res.reservation_status);
end $$;

select is((select value from external_sync_test_results where key = 'unlinked_reserved'), 'reserved', 'initial unlinked reservation succeeds');
select is((select value from external_sync_test_results where key = 'unlinked_foreign_owner'), 'identity_conflict', 'different organizer cannot reserve existing unlinked reference');
select is((select value from external_sync_test_results where key = 'unlinked_busy'), 'busy', 'different token cannot hijack active unlinked lease');
select is((select value from external_sync_test_results where key = 'unlinked_snapshot_preserved'), 'r1', 'rejected reservations do not mutate reference metadata');
select is((select value from external_sync_test_results where key = 'claim_expired_same_token'), 'claim_expired', 'claim rejects identical expired token');
select is((select value from external_sync_test_results where key = 'reserve_expired_same_token'), 'claim_expired', 'reserve rejects identical expired token');
select is((select value from external_sync_test_results where key = 'reserve_expired_takeover'), 'reserved', 'fresh token can take over an expired unlinked lease');
select is((select value from external_sync_test_results where key = 'claim_midtx_expired'), 'claim_expired', 'claim rejects lease expired after transaction start');
select is((select value from external_sync_test_results where key = 'reserve_midtx_expired'), 'claim_expired', 'reserve rejects lease expired after transaction start');
select is((select value from external_sync_test_results where key = 'complete_midtx_expired'), 'claim_expired', 'complete rejects lease expired after transaction start');
select is((select value from external_sync_test_results where key = 'reservation'), 'reserved', 'external identity is reserved before canonical creation');
select is((select value from external_sync_test_results where key = 'complete_null'), 'invalid_action', 'completion rejects a null canonical action');
select is((select value from external_sync_test_results where key = 'complete_wrong_organizer'), 'organizer_mismatch', 'completion rejects an action owned by another organizer');
select is((select value from external_sync_test_results where key = 'complete_link'), 'linked', 'completion links the canonical action after validation');
select is((select value from external_sync_test_results where key = 'changed_source_identity'), repeat('a', 64), 'source event identity survives date and route revision');
select is((select value from external_sync_test_results where key = 'suppression'), 'suppressed', 'administrative suppression creates a tombstone');
select is((select value from external_sync_test_results where key = 'suppression_idempotent_replay'), 'suppressed', 'identical suppression replay is idempotent');
select is((select value from external_sync_test_results where key = 'suppression_op_collision'), 'operation_conflict', 'incompatible operation_id reuse is rejected');
select is((select value from external_sync_test_results where key = 'second_action_not_suppressed'), 'active', 'operation_id collision does not mutate second action');
select is((select value from external_sync_test_results where key = 'native_suppression'), 'not_synced', 'native foreign actions cannot be suppressed by external synchronization');
select is((select value from external_sync_test_results where key = 'same_identity_tombstone'), 'suppressed', 'tombstone prevents another source from reactivating the identity');
select is((select count(*)::integer from private.external_action_sync_suppression_audit where operation_id = 'op-fixture'), 1, 'suppression audit evidence is persisted transactionally');
select is((select action_id::text from private.external_action_sync_suppression_audit where operation_id = 'op-fixture'), (select action_id::text from private.external_action_sync_identities where identity_hash = repeat('a', 64)), 'audit row remains bound to original action');

select * from finish();
rollback;
