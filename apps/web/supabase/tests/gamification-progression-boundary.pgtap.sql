begin;

select plan(45);

-- The projection is server-owned. The assertions below verify the effective
-- grants first, then use the real reconciliation RPC for producer behavior.
select ok(not has_table_privilege('authenticated', 'public.progression_events', 'SELECT'), 'authenticated cannot read the progression ledger directly');
select ok(not has_table_privilege('authenticated', 'public.progression_events', 'INSERT'), 'authenticated cannot insert progression events');
select ok(not has_table_privilege('authenticated', 'public.progression_profiles', 'UPDATE'), 'authenticated cannot rewrite progression profiles');
select ok(not has_function_privilege('authenticated', 'public.apply_gamification_reconciliation(text, jsonb, jsonb, jsonb, bigint[], timestamptz, jsonb, jsonb, jsonb)', 'EXECUTE'), 'authenticated cannot execute reconciliation');
select ok(has_function_privilege('service_role', 'public.apply_gamification_reconciliation(text, jsonb, jsonb, jsonb, bigint[], timestamptz, jsonb, jsonb, jsonb)', 'EXECUTE'), 'service_role can execute reconciliation');
select ok(to_regclass('public.uq_progression_events_logical_identity') is not null, 'progression events have a logical identity index');
select ok(to_regclass('public.app_notifications_gamification_reconciliation_id_idx') is not null, 'gamification receipts have a deterministic dedupe index');
select ok(has_column_privilege('service_role', 'public.progression_profiles', 'current_applied_rules_revision', 'SELECT'), 'rules revision state is persisted on the profile');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

-- This is a LEGACY fact fixture only. It must survive every CURRENT rebuild.
insert into public.progression_events (
  user_id, event_type, source_table, source_id, status_phase,
  weight, xp_base, xp_awarded, occurred_on, metadata
) values (
  'm7c-owner-a', 'sensitive_zone_milestone', 'sensitive_zone_progression',
  'm7c-legacy-1', 'validated', 1, 4, 4, '2025-01-01', '{}'::jsonb
);
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a'), 1, 'the legacy source fact exists before CURRENT projection');

select is(
  (public.apply_gamification_reconciliation(
    'm7c-owner-a',
    '[]'::jsonb,
    '[{"event_type":"action_declare_validation","source_table":"actions","source_id":"m7c-current-action","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{"gamificationEngine":"CURRENT_RECONCILABLE","logicalId":"m7c-owner-a:organisation:actions:m7c-current-action::validated","mechanicId":"organisation","rulesVersion":"gamification-2026.10-v1"}}]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    '{"xp_total":5,"xp_pending":0,"xp_validated":5,"current_level":1,"potential_level":3,"current_applied_rules_revision":16}'::jsonb,
    '{"reconciliationId":"m7c-reconciliation-a","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
    null
  ) ->> 'status'),
  'applied',
  'the real reconciliation RPC applies a CURRENT projection'
);
select is(
  (public.apply_gamification_reconciliation(
    'm7c-owner-a',
    '[]'::jsonb,
    '[{"event_type":"action_declare_validation","source_table":"actions","source_id":"m7c-current-action","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{"gamificationEngine":"CURRENT_RECONCILABLE","logicalId":"m7c-owner-a:organisation:actions:m7c-current-action::validated","mechanicId":"organisation","rulesVersion":"gamification-2026.10-v1"}}]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    '{"xp_total":5,"xp_pending":0,"xp_validated":5,"current_level":1,"potential_level":3,"current_applied_rules_revision":16}'::jsonb,
    '{"reconciliationId":"m7c-reconciliation-a","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
    null
  ) ->> 'status'),
  'applied',
  'a producer retry remains an applied no-op rather than failing'
);
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and source_id = 'm7c-current-action'), 1, 'the CURRENT event is persisted exactly once');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a'), 2, 'the CURRENT projection does not replace the LEGACY fact');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and status_phase = 'validated' and xp_awarded = 5), 1, 'the persisted ledger carries the exact validated XP total');
select is((select xp_total::integer from public.progression_profiles where user_id = 'm7c-owner-a'), 5, 'the profile total is synchronized with legacy plus CURRENT XP');
select is((select xp_validated::integer from public.progression_profiles where user_id = 'm7c-owner-a'), 5, 'the profile validated total is persisted');
select is((select current_applied_rules_revision from public.progression_profiles where user_id = 'm7c-owner-a'), 16, 'the applied rules revision is persisted');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7c-owner-a' and type = 'gamification_reconciliation'), 1, 'one visible reconciliation produces one receipt');
select is((select payload ->> 'reconciliationId' from public.app_notifications where user_id = 'm7c-owner-a' and type = 'gamification_reconciliation'), 'm7c-reconciliation-a', 'the receipt keeps its deterministic identity');
select is((public.apply_gamification_reconciliation(
  'm7c-owner-a',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-a'),
  '[]'::jsonb, '[]'::jsonb, '{}'::bigint[],
  (select updated_at from public.progression_profiles where user_id = 'm7c-owner-a'),
  '{"xp_total":5,"xp_pending":0,"xp_validated":5,"current_level":1,"potential_level":3,"current_applied_rules_revision":16}'::jsonb,
  '{"reconciliationId":"m7c-reconciliation-a","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
  null
) ->> 'inserted')::integer, 0, 'an exact retry modifies zero ledger rows');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7c-owner-a' and type = 'gamification_reconciliation'), 1, 'an exact retry does not duplicate the receipt');

select is((public.apply_gamification_reconciliation(
  'm7c-owner-b', '[]'::jsonb,
  '[{"event_type":"participant_tier_unlock","source_table":"action_participants","source_id":"m7c-participant-tier-1","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{"gamificationEngine":"CURRENT_RECONCILABLE","logicalId":"m7c-owner-b:participation:action_participants:m7c-participant-tier-1::validated","mechanicId":"participation","rulesVersion":"gamification-2026.10-v1"}}]'::jsonb,
  '[]'::jsonb, '{}'::bigint[], null, null, null, null
) ->> 'inserted')::integer, 1, 'a second recipient receives an independent CURRENT event');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and source_id = 'm7c-participant-tier-1'), 0, 'owner A cannot receive owner B projection rows');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-b' and source_id = 'm7c-participant-tier-1'), 1, 'owner B has exactly its own projection row');
select is((select count(*)::integer from public.progression_profiles where user_id = 'm7c-owner-b'), 0, 'a ledger-only apply does not manufacture an unrelated profile projection');
select is((public.apply_gamification_reconciliation(
  'm7c-owner-b',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-b'),
  '[]'::jsonb,
  (select jsonb_build_array(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', 2, 'xp_awarded', 2, 'occurred_on', occurred_on,
    'metadata', metadata
  )) from public.progression_events where user_id = 'm7c-owner-b'),
  '{}'::bigint[], null, null, null, null
) ->> 'updated')::integer, 1, 'the RPC reports exactly one persisted update');
select is((select xp_awarded::integer from public.progression_events where user_id = 'm7c-owner-b' and source_id = 'm7c-participant-tier-1'), 2, 'the updated event state is persisted');
select is((public.apply_gamification_reconciliation(
  'm7c-owner-b',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-b'),
  '[]'::jsonb, '[]'::jsonb,
  array[(select id from public.progression_events where user_id = 'm7c-owner-b')]::bigint[], null, null, null, null
) ->> 'removed')::integer, 1, 'the RPC reports exactly one persisted removal');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-b'), 0, 'the removed projection row is absent after the RPC');
select is((public.apply_gamification_reconciliation(
  'm7c-no-visible-change', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::bigint[], null, null,
  '{"reconciliationId":"m7c-no-visible-change","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":false}'::jsonb,
  null
) ->> 'status'), 'applied', 'a no-visible-change rebuild remains successful');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7c-no-visible-change'), 0, 'a no-visible-change rebuild creates no receipt');

-- A deliberately stale ledger snapshot must not partially apply a new event.
insert into public.progression_events (
  user_id, event_type, source_table, source_id, status_phase,
  weight, xp_base, xp_awarded, occurred_on, metadata
) values (
  'm7c-owner-a', 'action_declare_validation', 'actions', 'm7c-stale-source',
  'validated', 1, 1, 1, '2026-10-26', '{}'::jsonb
);
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and source_id = 'm7c-stale-source'), 1, 'the concurrent ledger change exists before the stale call');
select is((public.apply_gamification_reconciliation(
  'm7c-owner-a',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-a' and source_id <> 'm7c-stale-source'),
  '[{"event_type":"action_declare_validation","source_table":"actions","source_id":"m7c-stale-attempt","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{}}]'::jsonb,
  '[]'::jsonb, '{}'::bigint[], null, null, null, null
) ->> 'status'), 'conflict', 'a stale ledger snapshot is rejected');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and source_id = 'm7c-stale-attempt'), 0, 'a stale rejection writes no attempted event');
select is((select xp_total::integer from public.progression_profiles where user_id = 'm7c-owner-a'), 5, 'a stale ledger rejection leaves the profile unchanged');
select is((public.apply_gamification_reconciliation(
  'm7c-owner-a',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-a'),
  '[]'::jsonb, '[]'::jsonb, '{}'::bigint[], '2000-01-01T00:00:00Z'::timestamptz,
  '{"xp_total":6,"xp_pending":0,"xp_validated":6,"current_level":1,"potential_level":3,"current_applied_rules_revision":16}'::jsonb,
  null, null
) ->> 'status'), 'conflict', 'a stale profile revision is rejected');
select is((select xp_total::integer from public.progression_profiles where user_id = 'm7c-owner-a'), 5, 'a stale profile rejection leaves totals unchanged');

-- An exception after the ledger insert must roll the whole transaction back.
select throws_ok($$select public.apply_gamification_reconciliation(
  'm7c-owner-a',
  (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'event_type', event_type, 'source_table', source_table,
    'source_id', source_id, 'status_phase', status_phase, 'weight', weight,
    'xp_base', xp_base, 'xp_awarded', xp_awarded, 'occurred_on', occurred_on,
    'metadata', metadata
  ) order by id), '[]'::jsonb) from public.progression_events where user_id = 'm7c-owner-a'),
  '[{"event_type":"action_declare_validation","source_table":"actions","source_id":"m7c-rollback-event","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{}}]'::jsonb,
  '[]'::jsonb, '{}'::bigint[], null,
  '{"xp_total":"not-a-number","xp_pending":0,"xp_validated":5,"current_level":1,"potential_level":3,"current_applied_rules_revision":16}'::jsonb,
  null, null
)$$, '22P02', null, 'an invalid profile projection aborts the reconciliation');
select is((select count(*)::integer from public.progression_events where user_id = 'm7c-owner-a' and source_id = 'm7c-rollback-event'), 0, 'the failed reconciliation rolls back its ledger event');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7c-owner-a' and payload ->> 'reconciliationId' = 'm7c-rollback-receipt'), 0, 'the failed reconciliation creates no receipt');
select is((select xp_total::integer from public.progression_profiles where user_id = 'm7c-owner-a'), 5, 'the failed reconciliation preserves the prior profile');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"m7c-owner-a"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$insert into public.progression_events (user_id, event_type, source_table, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on) values ('m7c-owner-a', 'forged', 'actions', 'm7c-forged', 'validated', 1, 1, 1, current_date)$$, '42501', null, 'authenticated cannot forge a progression event');
select throws_ok($$update public.progression_profiles set xp_total = 999 where user_id = 'm7c-owner-a'$$, '42501', null, 'authenticated cannot forge a profile projection');
select throws_ok($$select public.apply_gamification_reconciliation('m7c-owner-a', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::bigint[], null, null, null, null)$$, '42501', null, 'authenticated cannot invoke the privileged reconciliation RPC');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$select public.apply_gamification_reconciliation('m7c-owner-b', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::bigint[], null, null, null, null)$$, '42501', null, 'a session without a subject cannot invoke reconciliation');

select * from finish();
rollback;
