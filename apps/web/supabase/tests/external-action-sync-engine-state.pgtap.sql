begin;
select plan(21);

select ok(has_table_privilege('service_role', 'private.external_action_sync_subscriptions', 'INSERT'), 'service role can manage external sync subscriptions');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_subscriptions', 'SELECT'), 'authenticated cannot read private external sync subscriptions');
select ok(has_table_privilege('service_role', 'private.external_action_sync_proposals', 'INSERT'), 'service role can manage external sync proposals');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_proposals', 'SELECT'), 'authenticated cannot read private external sync proposals');
select ok(not has_function_privilege('authenticated', 'public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text)', 'EXECUTE'), 'authenticated cannot mark external sync reference applied');

create temp table engine_state_results (key text primary key, value text);

do $$
declare
  v_action uuid := gen_random_uuid();
  v_rejected_action uuid := gen_random_uuid();
  v_hash text := repeat('7', 64);
  v_rejected_hash text := repeat('6', 64);
  v_token uuid := gen_random_uuid();
  v_rejected_token uuid := gen_random_uuid();
  v_sub_id uuid;
  v_prop_a uuid;
  v_prop_a_replay uuid;
  v_applied_revoked text;
  v_applied_ok text;
  v_suppressed text;
  v_suppressed_replay text;
  v_suppressed_tombstone text;
  v_suppressed_rejected text;
  v_hidden text;
  v_pub_at timestamptz;
  v_cancelled_at_1 timestamptz;
  v_cancelled_at_2 timestamptz;
  v_cancelled_by text;
  v_cancelled_from text;
  v_reversal_blocked text := 'false';
  v_rejected_status text;
  v_rejected_from text;
  v_rejected_vis text;
  v_cross_org_err text := 'none';
  v_resolve_wrong_org text;
begin
  set local role postgres;
  insert into public.actions (
    id, created_by_clerk_id, organizer_id, organizer_type, action_date,
    action_phase, status, published_at, location_label, moderation_visibility
  ) values (
    v_action, 'user-org-a', 'org-a', 'association', '2027-07-10',
    'pre_action', 'pending', now(), 'Place A', 'visible'
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

  -- Suppression removes action from public surfaces atomically and closes groupJoinEnabled in notes
  v_suppressed := public.suppress_external_action_sync_action(v_action, 'admin-1', 'pgtap-sup-1', 'Suppression canonique');
  select moderation_visibility, published_at, notes, cancelled_at, cancelled_by_clerk_id, cancelled_from_status
    into v_hidden, v_pub_at, v_cross_org_err, v_cancelled_at_1, v_cancelled_by, v_cancelled_from
    from public.actions where id = v_action;
  insert into engine_state_results values ('suppressed_status', v_suppressed);
  insert into engine_state_results values ('suppressed_visibility', v_hidden);
  insert into engine_state_results values ('suppressed_published_at_is_null', case when v_pub_at is null then 'true' else 'false' end);
  insert into engine_state_results values ('suppressed_group_join_notes', case when v_cross_org_err like '%[cmm-meta]%' and (v_cross_org_err like '%"groupJoinEnabled": false%' or v_cross_org_err like '%"groupJoinEnabled":false%') then 'true' else 'false' end);
  insert into engine_state_results values ('suppressed_cancelled_from', coalesce(v_cancelled_from, 'null'));
  insert into engine_state_results values ('suppressed_cancelled_by', coalesce(v_cancelled_by, 'null'));

  -- Idempotent replay and tombstone immutability
  v_suppressed_replay := public.suppress_external_action_sync_action(v_action, 'admin-1', 'pgtap-sup-1', 'Suppression canonique');
  v_suppressed_tombstone := public.suppress_external_action_sync_action(v_action, 'admin-1', 'pgtap-sup-2', 'Suppression canonique');
  select cancelled_at into v_cancelled_at_2 from public.actions where id = v_action;
  insert into engine_state_results values ('suppressed_replay', v_suppressed_replay);
  insert into engine_state_results values ('suppressed_tombstone_immutable', case when v_suppressed_tombstone = 'suppressed' and v_cancelled_at_2 = v_cancelled_at_1 then 'true' else 'false' end);

  -- Reversing a cancelled tombstone is blocked
  begin
    set local role postgres;
    update public.actions set status = 'approved' where id = v_action;
  exception when others then
    v_reversal_blocked := 'true';
  end;
  insert into engine_state_results values ('cancelled_reversal_blocked', v_reversal_blocked);

  -- Suppressing a rejected synced action keeps status='rejected' without fabricating cancelled_from_status
  set local role postgres;
  insert into public.actions (
    id, created_by_clerk_id, organizer_id, organizer_type, action_date,
    action_phase, status, published_at, location_label, moderation_visibility
  ) values (
    v_rejected_action, 'user-org-a', 'org-a', 'association', '2027-07-11',
    'pre_action', 'rejected', now(), 'Place B', 'visible'
  );
  set local role service_role;
  perform * from public.reserve_external_action_sync_reference(
    v_rejected_hash, 'org-a', 'user-org-a', v_rejected_token, 'jagis_pour_la_nature', 'ext-state-2',
    'https://example.test/e2', 'r2', '{"v":1}'::jsonb, repeat('5', 64)
  );
  perform public.complete_external_action_sync_identity(v_rejected_hash, v_rejected_token, v_rejected_action);
  v_suppressed_rejected := public.suppress_external_action_sync_action(v_rejected_action, 'admin-1', 'pgtap-sup-3', 'Suppression action rejetee');
  select status, cancelled_from_status, moderation_visibility
    into v_rejected_status, v_rejected_from, v_rejected_vis
    from public.actions where id = v_rejected_action;
  insert into engine_state_results values ('suppressed_rejected_status', v_suppressed_rejected || ':' || v_rejected_status);
  insert into engine_state_results values ('suppressed_rejected_from_null', case when v_rejected_from is null then 'true' else 'false' end);
  insert into engine_state_results values ('suppressed_rejected_hidden', v_rejected_vis);
end $$;

select is((select value from engine_state_results where key = 'applied_without_consent'), 'mandate_revoked', 'mark applied fails closed without consent');
select is((select value from engine_state_results where key = 'applied_with_consent'), 'applied', 'mark applied succeeds with active consented mandate');
select is((select value from engine_state_results where key = 'cross_org_proposal'), 'proposal_organizer_conflict', 'cross-organization proposal overwrite is rejected');
select is((select value from engine_state_results where key = 'resolve_wrong_org'), 'not_found', 'proposal resolution is isolated by organizer_directory_id');
select is((select value from engine_state_results where key = 'proposal_stays_resolved'), 'resolved', 'resolved proposal stays resolved for identical content hash');
select is((select value from engine_state_results where key = 'suppressed_visibility'), 'hidden', 'suppression hides canonical action from public surfaces');
select is((select value from engine_state_results where key = 'suppressed_published_at_is_null'), 'true', 'suppression unpublishes canonical action');
select is((select value from engine_state_results where key = 'suppressed_group_join_notes'), 'true', 'suppression sets groupJoinEnabled=false in canonical notes');
select is((select value from engine_state_results where key = 'suppressed_cancelled_from'), 'pending', 'suppression records exact prior status in cancelled_from_status');
select is((select value from engine_state_results where key = 'suppressed_cancelled_by'), 'admin-1', 'suppression records cancelled_by_clerk_id');
select is((select value from engine_state_results where key = 'suppressed_replay'), 'suppressed', 'suppression replay with same operation_id is idempotent');
select is((select value from engine_state_results where key = 'suppressed_tombstone_immutable'), 'true', 'suppression leaves existing cancelled tombstone immutable');
select is((select value from engine_state_results where key = 'cancelled_reversal_blocked'), 'true', 'cancelled action cannot be reversed back to approved');
select is((select value from engine_state_results where key = 'suppressed_rejected_status'), 'suppressed:rejected', 'suppressing a rejected action keeps status=rejected');
select is((select value from engine_state_results where key = 'suppressed_rejected_from_null'), 'true', 'suppressing a rejected action does not fabricate cancelled_from_status');
select is((select value from engine_state_results where key = 'suppressed_rejected_hidden'), 'hidden', 'suppressing a rejected action hides it from public surfaces');

select * from finish();
rollback;
