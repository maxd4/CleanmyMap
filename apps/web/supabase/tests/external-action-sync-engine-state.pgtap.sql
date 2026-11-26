begin;
select plan(12);

select ok(has_table_privilege('service_role', 'private.external_action_sync_subscriptions', 'INSERT'), 'service role can manage external sync subscriptions');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_subscriptions', 'SELECT'), 'authenticated cannot read private external sync subscriptions');
select ok(has_table_privilege('service_role', 'private.external_action_sync_proposals', 'INSERT'), 'service role can manage external sync proposals');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_proposals', 'SELECT'), 'authenticated cannot read private external sync proposals');
select ok(not has_function_privilege('authenticated', 'public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text)', 'EXECUTE'), 'authenticated cannot mark external sync reference applied');

create temp table engine_state_results (key text primary key, value text);

do $$
declare
  v_action uuid := gen_random_uuid();
  v_hash text := repeat('7', 64);
  v_token uuid := gen_random_uuid();
  v_sub_id uuid;
  v_prop_a uuid;
  v_prop_a_replay uuid;
  v_applied_revoked text;
  v_applied_ok text;
  v_suppressed text;
  v_hidden text;
  v_pub_at timestamptz;
  v_cross_org_err text := 'none';
  v_resolve_wrong_org text;
begin
  set local role postgres;
  insert into public.actions (
    id, created_by_clerk_id, organizer_id, organizer_type, action_date,
    action_phase, status, published_at, location_label, moderation_visibility, group_join_enabled
  ) values (
    v_action, 'user-org-a', 'org-a', 'association', '2027-07-10',
    'pre_action', 'pending', now(), 'Place A', 'visible', true
  );

  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role","sub":"pgtap-engine-state"}', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);

  v_sub_id := public.upsert_external_action_sync_subscription(
    'org-a', 'jagis_pour_la_nature', 'user-org-a', '{}'::text[],
    'struct-a', 'https://example.test/a', 'synthetic_fixture', true, 'auth-1', '2026-11-01', null, null
  );

  perform * from public.reserve_external_action_sync_reference(
    v_hash, 'org-a', 'user-org-a', v_token, 'jagis_pour_la_nature', 'ext-state-1',
    'https://example.test/e1', 'r1', '{"v":1}'::jsonb, repeat('8', 64)
  );
  perform public.complete_external_action_sync_identity(v_hash, v_token, v_action);

  -- Without consent_granted_at, mark_external_action_sync_reference_applied refuses with mandate_revoked.
  v_applied_revoked := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":1}'::jsonb, repeat('8', 64), 'r1'
  );
  insert into engine_state_results values ('applied_without_consent', v_applied_revoked);

  -- Grant consent, then mark applied succeeds.
  perform public.upsert_external_action_sync_subscription(
    'org-a', 'jagis_pour_la_nature', 'user-org-a', '{}'::text[],
    'struct-a', 'https://example.test/a', 'synthetic_fixture', true, 'auth-1', '2026-11-01', null, clock_timestamp()
  );
  v_applied_ok := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":1}'::jsonb, repeat('8', 64), 'r1'
  );
  insert into engine_state_results values ('applied_with_consent', v_applied_ok);

  -- Proposal organizer isolation & durable resolution
  v_prop_a := public.upsert_external_action_sync_proposal(
    'org-a', 'jagis_pour_la_nature', 'ext-prop-1', null, v_action, 'field_conflict',
    '{"title":"A"}'::jsonb, array[v_action], '[]'::jsonb, repeat('9', 64)
  );
  begin
    perform public.upsert_external_action_sync_proposal(
      'org-b', 'jagis_pour_la_nature', 'ext-prop-1', null, v_action, 'field_conflict',
      '{"title":"B"}'::jsonb, array[v_action], '[]'::jsonb, repeat('9', 64)
    );
  exception when others then
    v_cross_org_err := sqlerrm;
  end;
  insert into engine_state_results values ('cross_org_proposal', v_cross_org_err);

  v_resolve_wrong_org := public.resolve_external_action_sync_proposal(v_prop_a, 'resolved', 'admin-1', 'ok', 'org-b');
  insert into engine_state_results values ('resolve_wrong_org', v_resolve_wrong_org);

  perform public.resolve_external_action_sync_proposal(v_prop_a, 'resolved', 'admin-1', 'ok', 'org-a');
  v_prop_a_replay := public.upsert_external_action_sync_proposal(
    'org-a', 'jagis_pour_la_nature', 'ext-prop-1', null, v_action, 'field_conflict',
    '{"title":"A"}'::jsonb, array[v_action], '[]'::jsonb, repeat('9', 64)
  );
  insert into engine_state_results values (
    'proposal_stays_resolved',
    (select status from private.external_action_sync_proposals where id = v_prop_a_replay)
  );

  -- Suppression removes action from public surfaces atomically
  v_suppressed := public.suppress_external_action_sync_action(v_action, 'admin-1', 'pgtap-sup-1', 'Suppression canonique');
  select moderation_visibility, published_at into v_hidden, v_pub_at from public.actions where id = v_action;
  insert into engine_state_results values ('suppressed_status', v_suppressed);
  insert into engine_state_results values ('suppressed_visibility', v_hidden);
  insert into engine_state_results values ('suppressed_published_at_is_null', case when v_pub_at is null then 'true' else 'false' end);
end $$;

select is((select value from engine_state_results where key = 'applied_without_consent'), 'mandate_revoked', 'mark applied fails closed without consent');
select is((select value from engine_state_results where key = 'applied_with_consent'), 'applied', 'mark applied succeeds with active consented mandate');
select is((select value from engine_state_results where key = 'cross_org_proposal'), 'proposal_organizer_conflict', 'cross-organization proposal overwrite is rejected');
select is((select value from engine_state_results where key = 'resolve_wrong_org'), 'not_found', 'proposal resolution is isolated by organizer_directory_id');
select is((select value from engine_state_results where key = 'proposal_stays_resolved'), 'resolved', 'resolved proposal stays resolved for identical content hash');
select is((select value from engine_state_results where key = 'suppressed_visibility'), 'hidden', 'suppression hides canonical action from public surfaces');
select is((select value from engine_state_results where key = 'suppressed_published_at_is_null'), 'true', 'suppression unpublishes canonical action');

select * from finish();
rollback;
