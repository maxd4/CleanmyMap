begin;
select plan(44);

select ok(has_table_privilege('service_role', 'private.external_action_sync_subscriptions', 'INSERT'), 'service role can manage external sync subscriptions');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_subscriptions', 'SELECT'), 'authenticated cannot read private external sync subscriptions');
select ok(has_table_privilege('service_role', 'private.external_action_sync_proposals', 'INSERT'), 'service role can manage external sync proposals');
select ok(not has_table_privilege('authenticated', 'private.external_action_sync_proposals', 'SELECT'), 'authenticated cannot read private external sync proposals');
select ok(not has_function_privilege('authenticated', 'public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text, timestamptz)', 'EXECUTE'), 'authenticated cannot mark external sync reference applied');
select ok(not has_function_privilege('authenticated', 'public.apply_external_action_sync_pre_action(uuid, text, text, text, timestamptz, jsonb, jsonb, text, text)', 'EXECUTE'), 'authenticated cannot atomically apply external sync action changes');
select ok(not has_function_privilege('authenticated', 'public.update_external_action_sync_pre_action(uuid, text, text, text, timestamptz, jsonb, boolean)', 'EXECUTE'), 'authenticated cannot update external sync pre-action');
select ok(not has_function_privilege('authenticated', 'public.submit_external_action_sync_review(uuid, text, text, text, timestamptz)', 'EXECUTE'), 'authenticated cannot submit external sync review');

set local role service_role;
create temp table engine_state_results (key text primary key, value text);
reset role;

insert into public.profiles (id, display_name, handle)
values ('user-org-a', 'Org A User', 'org-a-user')
on conflict (id) do nothing;
select ok(exists (select 1 from public.profiles where id = 'user-org-a'), 'external sync test owner fixture exists before the engine block');

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
  v_applied_stale text;
  v_applied_retry text;
  v_applied_at_first timestamptz;
  v_applied_at_retry timestamptz;
  v_applied_snapshot_after_stale jsonb;
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
  v_phase text := 'insert_initial_action';
begin
  insert into public.actions (
    id, created_by_clerk_id, organizer_id, organizer_type, action_date,
    action_phase, status, published_at, location_label, moderation_visibility
  ) values (
    v_action, 'user-org-a', 'org-a', 'association', '2027-07-10',
    'pre_action', 'pending', now(), 'Place A', 'visible'
  );

  v_phase := 'set_service_role_claims';
  perform set_config('request.jwt.claims', '{"role":"service_role","sub":"pgtap-engine-state"}', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);

  v_phase := 'upsert_subscription_without_consent';
  v_sub_id := public.upsert_external_action_sync_subscription(
    'org-a', 'jagis_pour_la_nature', 'user-org-a', '{}'::text[],
    'struct-a', 'https://example.test/a', 'synthetic_fixture', true, 'auth-1', '2026-11-01', null, null
  );

  v_phase := 'reserve_initial_reference';
  perform * from public.reserve_external_action_sync_reference(
    v_hash, 'org-a', 'user-org-a', v_token, 'jagis_pour_la_nature', 'ext-state-1',
    'https://example.test/e1', 'r1', '{"v":1}'::jsonb, repeat('8', 64)
  );
  v_phase := 'complete_initial_identity';
  perform public.complete_external_action_sync_identity(v_hash, v_token, v_action);

  -- Without consent_granted_at, mark_external_action_sync_reference_applied refuses with mandate_revoked.
  v_phase := 'mark_reference_without_consent';
  v_applied_revoked := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":1}'::jsonb, repeat('8', 64), 'r1'
  );
  v_phase := 'store_without_consent_result';
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

  select applied_at into v_applied_at_first
    from private.external_action_sync_references
   where source_id = 'jagis_pour_la_nature' and external_event_id = 'ext-state-1';
  perform * from public.reserve_external_action_sync_reference(
    v_hash, 'org-a', 'user-org-a', v_token, 'jagis_pour_la_nature', 'ext-state-1',
    'https://example.test/e1', 'r2', '{"v":2}'::jsonb, repeat('9', 64)
  );
  v_applied_stale := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":1}'::jsonb, repeat('8', 64), 'r1'
  );
  select applied_snapshot into v_applied_snapshot_after_stale
    from private.external_action_sync_references
   where source_id = 'jagis_pour_la_nature' and external_event_id = 'ext-state-1';
  insert into engine_state_results values ('applied_old_revision', v_applied_stale);
  insert into engine_state_results values ('applied_old_snapshot_preserved', v_applied_snapshot_after_stale::text);

  v_applied_ok := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":2}'::jsonb, repeat('9', 64), 'r2'
  );
  select applied_at into v_applied_at_first
    from private.external_action_sync_references
   where source_id = 'jagis_pour_la_nature' and external_event_id = 'ext-state-1';
  v_applied_retry := public.mark_external_action_sync_reference_applied(
    'jagis_pour_la_nature', 'ext-state-1', '{"v":2}'::jsonb, repeat('9', 64), 'r2'
  );
  select applied_at into v_applied_at_retry
    from private.external_action_sync_references
   where source_id = 'jagis_pour_la_nature' and external_event_id = 'ext-state-1';
  insert into engine_state_results values ('applied_retry', v_applied_retry);
  insert into engine_state_results values ('applied_retry_timestamp_stable', case when v_applied_at_retry = v_applied_at_first then 'true' else 'false' end);

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

  -- Transactional update_external_action_sync_pre_action and submit_external_action_sync_review
  declare
    v_review_action uuid := gen_random_uuid();
    v_review_hash text := repeat('4', 64);
    v_review_token uuid := gen_random_uuid();
    v_non_assoc_action uuid := gen_random_uuid();
    v_non_assoc_hash text := repeat('2', 64);
    v_non_assoc_token uuid := gen_random_uuid();
    v_incomplete_action uuid := gen_random_uuid();
    v_incomplete_hash text := repeat('1', 64);
    v_incomplete_token uuid := gen_random_uuid();
    v_stale_ts timestamptz := '2020-01-01T00:00:00Z'::timestamptz;
    v_upd_ok text;
    v_upd_stale text;
    v_stale_label text;
    v_persisted_label text;
    v_rev_ok jsonb;
    v_rev_stale jsonb;
    v_persisted_review_state text;
    v_rev_replay jsonb;
    v_rev_decided jsonb;
    v_rev_not_required jsonb;
    v_rev_incomplete jsonb;
    v_upd_revoked text;
    v_rev_revoked jsonb;
    v_tomb_upd text;
    v_tomb_rev jsonb;
  begin
    set local role postgres;
    insert into public.profiles (id, display_name, handle)
    values ('user-org-a', 'Org A User', 'org-a-user')
    on conflict (id) do nothing;
    insert into public.actions (
      id, created_by_clerk_id, organizer_id, organizer_type, organizer_name, action_date,
      action_phase, status, published_at, location_label, moderation_visibility, preparation_data
    ) values (
      v_review_action, 'user-org-a', 'org-a', 'association', 'Org A', '2027-08-01',
      'pre_action', 'pending', null, 'Place Review', 'visible',
      jsonb_build_object(
        'formalitiesWorkflow', jsonb_build_object(
          'schemaVersion', 'action-formalities-workflow-v1',
          'contentVersion', 'qualification-v1',
          'trace', jsonb_build_object(
            'qualifiedAt', '2026-10-30T10:00:00Z',
            'rulesetVersion', 'rules-v1',
            'officialSourceIds', '[]'::jsonb,
            'officialSources', '[]'::jsonb,
            'verifiedOn', '2026-10-30',
            'actionDependencyFingerprint', 'canonical-v2:fixture',
            'determiningFacts', jsonb_build_object(
              'territory', jsonb_build_object('countryCode', 'FR', 'code', 'FR-75', 'label', 'Paris'),
              'publicSpace', 'unknown',
              'manager', jsonb_build_object('kind', 'unknown', 'label', null),
              'isCleanwalk', true,
              'isPublicRoadwayActivity', 'unknown',
              'isItinerant', 'unknown',
              'isClaiming', 'unknown',
              'hasInstallations', false,
              'requiresPhysicalOccupation', false,
              'localCustomaryUse', 'unknown',
              'largeCrowdOrComplexInstallations', 'unknown'
            ),
            'formalities', jsonb_build_array(
              jsonb_build_object('id', 'optional', 'requirementStatus', 'recommended', 'procedureKind', 'information_only', 'sourceId', null)
            )
          ),
          'progress', jsonb_build_array(
            jsonb_build_object('formalityId', 'optional', 'userStatus', 'not_started', 'contentVersion', 'qualification-v1', 'statusChangedAt', null, 'proof', null, 'active', true, 'validForQualification', true, 'invalidatedAt', null)
          )
        )
      )
    );
    insert into public.actions (
      id, created_by_clerk_id, organizer_id, organizer_type, organizer_name, action_date,
      action_phase, status, published_at, location_label, moderation_visibility
    ) values (
      v_non_assoc_action, 'user-org-a', 'org-a', 'spontaneous', 'Org A', '2027-08-02',
      'pre_action', 'pending', null, 'Place Spontaneous', 'visible'
    );
    insert into public.actions (
      id, created_by_clerk_id, organizer_id, organizer_type, organizer_name, action_date,
      action_phase, status, published_at, location_label, moderation_visibility
    ) values (
      v_incomplete_action, 'user-org-a', 'org-a', 'association', null, '2027-08-03',
      'pre_action', 'pending', null, 'Place Incomplete', 'visible'
    );
    set local role service_role;
    perform * from public.reserve_external_action_sync_reference(
      v_review_hash, 'org-a', 'user-org-a', v_review_token, 'jagis_pour_la_nature', 'ext-state-review-1',
      'https://example.test/rev1', 'r1', '{"v":1}'::jsonb, repeat('3', 64)
    );
    perform public.complete_external_action_sync_identity(v_review_hash, v_review_token, v_review_action);

    perform * from public.reserve_external_action_sync_reference(
      v_non_assoc_hash, 'org-a', 'user-org-a', v_non_assoc_token, 'jagis_pour_la_nature', 'ext-state-non-assoc',
      'https://example.test/rev2', 'r1', '{"v":1}'::jsonb, repeat('3', 64)
    );
    perform public.complete_external_action_sync_identity(v_non_assoc_hash, v_non_assoc_token, v_non_assoc_action);

    perform * from public.reserve_external_action_sync_reference(
      v_incomplete_hash, 'org-a', 'user-org-a', v_incomplete_token, 'jagis_pour_la_nature', 'ext-state-incomplete',
      'https://example.test/rev3', 'r1', '{"v":1}'::jsonb, repeat('3', 64)
    );
    perform public.complete_external_action_sync_identity(v_incomplete_hash, v_incomplete_token, v_incomplete_action);

    v_upd_stale := public.update_external_action_sync_pre_action(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', v_stale_ts,
      '{"location_label":"Should Conflict"}'::jsonb, false
    );
    select location_label into v_stale_label from public.actions where id = v_review_action;

    v_upd_ok := public.update_external_action_sync_pre_action(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null,
      '{"location_label":"Place Review Updated"}'::jsonb, false
    );
    select location_label into v_persisted_label from public.actions where id = v_review_action;

    v_rev_stale := public.submit_external_action_sync_review(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', v_stale_ts
    );

    v_rev_ok := public.submit_external_action_sync_review(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null
    );
    select review_state into v_persisted_review_state from public.actions where id = v_review_action;

    v_rev_replay := public.submit_external_action_sync_review(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null
    );

    -- Approve review and verify submit_external_action_sync_review reports already_decided (never pending_review)
    perform public.decide_association_action_review(
      v_review_action, 'approve', 'admin-1', 'pgtap-decide-1', 'Validation associative pgtap', 'pending_review', null
    );
    v_rev_decided := public.submit_external_action_sync_review(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null
    );

    -- Non-associative and incomplete actions must never be reported as pending_review
    v_rev_not_required := public.submit_external_action_sync_review(
      v_non_assoc_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-non-assoc', null
    );
    v_rev_incomplete := public.submit_external_action_sync_review(
      v_incomplete_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-incomplete', null
    );

    -- Cancelled tombstone rejects both pre-action update and review submission
    v_tomb_upd := public.update_external_action_sync_pre_action(
      v_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-1', null,
      '{"location_label":"Tombstone Mutated"}'::jsonb, false
    );
    v_tomb_rev := public.submit_external_action_sync_review(
      v_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-1', null
    );

    -- Revoke mandate and verify both RPCs fail closed transactionally
    perform public.upsert_external_action_sync_subscription(
      'org-a', 'jagis_pour_la_nature', 'user-org-a', '{}'::text[],
      'struct-a', 'https://example.test/a', 'synthetic_fixture', false, 'auth-1', '2026-11-01', clock_timestamp(), clock_timestamp()
    );
    v_upd_revoked := public.update_external_action_sync_pre_action(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null,
      '{"location_label":"Should Fail"}'::jsonb, false
    );
    v_rev_revoked := public.submit_external_action_sync_review(
      v_review_action, 'org-a', 'jagis_pour_la_nature', 'ext-state-review-1', null
    );

    insert into engine_state_results values ('tx_update_stale_conflict', v_upd_stale);
    insert into engine_state_results values ('tx_update_stale_not_mutated', v_stale_label);
    insert into engine_state_results values ('tx_update_ok', v_upd_ok);
    insert into engine_state_results values ('tx_update_persisted_label', v_persisted_label);
    insert into engine_state_results values ('tx_review_stale_conflict', coalesce(v_rev_stale->>'status', 'null'));
    insert into engine_state_results values ('tx_review_ok', coalesce(v_rev_ok->>'status', 'null'));
    insert into engine_state_results values ('tx_review_persisted_state', coalesce(v_persisted_review_state, 'null'));
    insert into engine_state_results values ('tx_review_replay_pending', coalesce(v_rev_replay->>'status', 'null') || ':' || coalesce(v_rev_replay->>'review_status', 'null'));
    insert into engine_state_results values ('tx_review_already_decided', coalesce(v_rev_decided->>'status', 'null') || ':' || coalesce(v_rev_decided->>'review_state', 'null'));
    insert into engine_state_results values ('tx_review_not_required', coalesce(v_rev_not_required->>'status', 'null'));
    insert into engine_state_results values ('tx_review_incomplete_error', coalesce(v_rev_incomplete->>'status', 'null'));
    insert into engine_state_results values ('tx_tombstone_update_blocked', v_tomb_upd);
    insert into engine_state_results values ('tx_tombstone_review_blocked', coalesce(v_tomb_rev->>'status', 'null'));
    insert into engine_state_results values ('tx_update_revoked', v_upd_revoked);
    insert into engine_state_results values ('tx_review_revoked', coalesce(v_rev_revoked->>'status', 'null'));
  end;
exception when others then
  raise exception using
    errcode = SQLSTATE,
    message = format('TERRITORIAL_PHASE=%s ORIGINAL_SQLSTATE=%s', v_phase, SQLSTATE);
end $$;

select is((select value from engine_state_results where key = 'applied_without_consent'), 'mandate_revoked', 'mark applied fails closed without consent');
select is((select value from engine_state_results where key = 'applied_with_consent'), 'applied', 'mark applied succeeds with active consented mandate');
select is((select value from engine_state_results where key = 'applied_old_revision'), 'stale_revision', 'older observed source revision cannot replace applied snapshot');
select is((select value from engine_state_results where key = 'applied_old_snapshot_preserved'), '{"v":1}', 'stale source event leaves prior applied snapshot intact');
select is((select value from engine_state_results where key = 'applied_retry'), 'applied', 'same applied source revision is accepted idempotently');
select is((select value from engine_state_results where key = 'applied_retry_timestamp_stable'), 'true', 'idempotent applied retry preserves applied_at');
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
select is((select value from engine_state_results where key = 'tx_update_stale_conflict'), 'conflict', 'stale expected_updated_at returns optimistic conflict');
select is((select value from engine_state_results where key = 'tx_update_stale_not_mutated'), 'Place Review', 'stale expected_updated_at leaves canonical row untouched');
select is((select value from engine_state_results where key = 'tx_update_ok'), 'updated', 'transactional pre-action update succeeds under active mandate');
select is((select value from engine_state_results where key = 'tx_update_persisted_label'), 'Place Review Updated', 'transactional pre-action update persists new location_label');
select is((select value from engine_state_results where key = 'tx_review_stale_conflict'), 'conflict', 'stale expected_updated_at on review submission returns optimistic conflict');
select is((select value from engine_state_results where key = 'tx_review_ok'), 'pending_review', 'transactional review submission routes associative pre-action to pending_review');
select is((select value from engine_state_results where key = 'tx_review_persisted_state'), 'pending_review', 'transactional review submission persists review_state=pending_review');
select is((select value from engine_state_results where key = 'tx_review_replay_pending'), 'pending_review:already_submitted', 'transactional review replay preserves pending_review with already_submitted');
select is((select value from engine_state_results where key = 'tx_review_already_decided'), 'already_decided:approved', 'transactional review returns already_decided when action is already approved');
select is((select value from engine_state_results where key = 'tx_review_not_required'), 'not_required', 'transactional review returns not_required for non-associative actions');
select is((select value from engine_state_results where key = 'tx_review_incomplete_error'), 'review_error', 'transactional review returns review_error when content is incomplete');
select is((select value from engine_state_results where key = 'tx_tombstone_update_blocked'), 'suppressed', 'suppressed tombstone blocks pre-action update');
select is((select value from engine_state_results where key = 'tx_tombstone_review_blocked'), 'suppressed', 'suppressed tombstone blocks review submission');
select is((select value from engine_state_results where key = 'tx_update_revoked'), 'mandate_revoked', 'transactional pre-action update fails closed after mandate revocation');
select is((select value from engine_state_results where key = 'tx_review_revoked'), 'mandate_revoked', 'transactional review submission fails closed after mandate revocation');

select * from finish();
rollback;
