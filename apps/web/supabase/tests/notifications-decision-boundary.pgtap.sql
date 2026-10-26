begin;

select plan(73);

-- This proof deliberately separates database boundary checks from producer
-- checks. Direct service_role inserts are used only for the receipt/RLS
-- fixture; producer idempotence is exercised through the real RPCs below.
select ok(not has_table_privilege('anon', 'public.app_notifications', 'SELECT'), 'anon cannot read notifications');
select ok(has_table_privilege('authenticated', 'public.app_notifications', 'SELECT'), 'authenticated can read notifications');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'read_at', 'UPDATE'), 'owner can mark a notification read');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'seen_at', 'UPDATE'), 'owner can mark a notification seen');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'acknowledged_at', 'UPDATE'), 'owner can acknowledge a notification');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'title', 'UPDATE'), 'owner cannot rewrite notification title');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'content', 'UPDATE'), 'owner cannot rewrite notification content');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'payload', 'UPDATE'), 'owner cannot rewrite notification payload');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'user_id', 'UPDATE'), 'owner cannot transfer notification ownership');
select ok(not has_table_privilege('authenticated', 'public.app_notifications', 'INSERT'), 'authenticated cannot manufacture notifications');
select ok(has_table_privilege('service_role', 'public.app_notifications', 'INSERT'), 'service role can produce notifications');
select ok(to_regclass('public.app_notifications_action_update_event_unique_idx') is not null, 'action update notifications have a stable dedupe index');
select ok(to_regclass('public.app_notifications_action_result_event_unique_idx') is not null, 'action result notifications have a stable dedupe index');
select ok(to_regclass('public.app_notifications_gamification_reconciliation_id_idx') is not null, 'gamification receipts have a stable dedupe index');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);

-- A direct row is a fixture for the RLS and receipt-state assertions only.
-- It is not evidence that a producer RPC or a concurrent transaction works.
insert into public.app_notifications (id, user_id, type, title, content, payload)
values (
  '70000000-0000-4000-8000-000000000101',
  'm7b-notification-owner-a',
  'system',
  'M7B receipt A',
  'Receipt fixture A',
  '{"kind":"m7b_receipt_fixture"}'::jsonb
);
insert into public.app_notifications (id, user_id, type, title, content, payload)
values (
  '70000000-0000-4000-8000-000000000102',
  'm7b-notification-owner-b',
  'system',
  'M7B receipt B',
  'Receipt fixture B',
  '{"kind":"m7b_receipt_fixture"}'::jsonb
);
select is((select count(*)::integer from public.app_notifications where payload ->> 'kind' = 'm7b_receipt_fixture'), 2, 'privileged fixture creates exactly two independent recipients');

-- The result producer is exercised with two confirmed registrations. The
-- action trigger ran before registrations existed; this explicit RPC call is
-- therefore the producer proof, not a table insert surrogate.
insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, status,
  action_phase, published_at, moderation_visibility, notes
)
values (
  '70000000-0000-4000-8000-000000000001',
  'm7b-result-owner',
  current_date - 1,
  'M7B result action',
  'approved',
  'post_action_complete',
  timezone('utc', now()),
  'visible',
  'M7B result producer fixture'
);
insert into public.action_registrations (action_id, user_id, registration_status, registration_source)
values
  ('70000000-0000-4000-8000-000000000001', 'm7b-result-recipient-a', 'confirmed', 'group_form'),
  ('70000000-0000-4000-8000-000000000001', 'm7b-result-recipient-b', 'confirmed', 'group_form');
select is(
  public.emit_action_result_notifications('70000000-0000-4000-8000-000000000001'::uuid),
  2,
  'result producer delivers exactly once to both confirmed recipients'
);
select is((select count(*)::integer from public.app_notifications where payload ->> 'actionId' = '70000000-0000-4000-8000-000000000001'), 2, 'result producer persists exactly two rows');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-result-recipient-a' and payload ->> 'decisionState' = 'pending'), 1, 'recipient A receives an independent pending decision');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-result-recipient-b' and payload ->> 'decisionState' = 'pending'), 1, 'recipient B receives an independent pending decision');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-result-owner'), 0, 'the action owner is not manufactured as a result recipient');
select is(
  public.emit_action_result_notifications('70000000-0000-4000-8000-000000000001'::uuid),
  0,
  'result producer retry reports no new rows'
);
select is((select count(*)::integer from public.app_notifications where payload ->> 'actionId' = '70000000-0000-4000-8000-000000000001'), 2, 'result producer retry does not duplicate persisted rows');
select is((select count(*)::integer from public.list_pending_action_result_prompts_for_recipient('m7b-result-recipient-a')), 1, 'pending result projection is visible only for recipient A');
select is((select count(*)::integer from public.list_pending_action_result_prompts_for_recipient('m7b-result-recipient-b')), 1, 'pending result projection is visible only for recipient B');
select is((select count(*)::integer from public.list_pending_action_result_prompts_for_recipient('m7b-result-owner')), 0, 'pending result projection does not expose an unrelated owner');
select is((select status from public.respond_to_action_result_prompt('70000000-0000-4000-8000-000000000001'::uuid, 'm7b-result-recipient-a', 'not_participated')), 'declined', 'recipient A can refuse its own pending result');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-result-recipient-a' and payload ->> 'decisionState' = 'treated' and payload ->> 'decision' = 'not_participated' and read_at is not null and seen_at is not null), 1, 'recipient A refusal persists treated receipt state');
select is((select count(*)::integer from public.action_participants where action_id = '70000000-0000-4000-8000-000000000001'::uuid and user_id = 'm7b-result-recipient-a'), 0, 'recipient A refusal does not create participation');
select is((select status from public.respond_to_action_result_prompt('70000000-0000-4000-8000-000000000001'::uuid, 'm7b-result-recipient-a', 'not_participated')), 'unavailable', 'recipient A replay after refusal is unavailable');
select is((select count(*)::integer from public.action_participants where action_id = '70000000-0000-4000-8000-000000000001'::uuid and user_id = 'm7b-result-recipient-a'), 0, 'recipient A replay still creates no participant');
select is((select status from public.respond_to_action_result_prompt('70000000-0000-4000-8000-000000000001'::uuid, 'm7b-result-recipient-b', 'claim')), 'claimed', 'recipient B can accept its own pending result');
select is((select count(*)::integer from public.action_participants where action_id = '70000000-0000-4000-8000-000000000001'::uuid and user_id = 'm7b-result-recipient-b' and participation_status = 'pending' and participation_source = 'post_action_claim'), 1, 'recipient B acceptance creates one pending claim');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-result-recipient-b' and payload ->> 'decisionState' = 'treated' and payload ->> 'decision' = 'claim' and read_at is not null and seen_at is not null), 1, 'recipient B acceptance persists treated receipt state');
select is((select status from public.respond_to_action_result_prompt('70000000-0000-4000-8000-000000000001'::uuid, 'm7b-result-recipient-b', 'claim')), 'unavailable', 'recipient B replay after acceptance is unavailable');
select is((select count(*)::integer from public.action_participants where action_id = '70000000-0000-4000-8000-000000000001'::uuid and user_id = 'm7b-result-recipient-b'), 1, 'recipient B replay does not create a second participant');
select is((select count(*)::integer from public.list_pending_action_result_prompts_for_recipient('m7b-result-recipient-a')), 0, 'refused recipient is removed from pending projection');
select is((select count(*)::integer from public.list_pending_action_result_prompts_for_recipient('m7b-result-recipient-b')), 0, 'accepted recipient is removed from pending projection');

-- A second real producer covers unread grouping and retry/replay behavior.
insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, status,
  action_phase, published_at, moderation_visibility, notes
)
values (
  '70000000-0000-4000-8000-000000000002',
  'm7b-update-owner',
  current_date + 10,
  'M7B update action',
  'approved',
  'pre_action',
  timezone('utc', now()),
  'visible',
  'M7B update producer fixture'
);
insert into public.action_registrations (action_id, user_id, registration_status, registration_source)
values ('70000000-0000-4000-8000-000000000002', 'm7b-update-recipient', 'confirmed', 'group_form');
select is(
  public.emit_action_update_notifications(
    '70000000-0000-4000-8000-000000000002'::uuid,
    'm7b-update-owner',
    array['schedule']::text[],
    'm7b-update-event-1'
  ),
  1,
  'update producer delivers to the confirmed participant and excludes the actor'
);
select is((select count(*)::integer from public.app_notifications where payload ->> 'eventKey' = 'm7b-update-event-1'), 1, 'update producer persists one event row');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-update-owner' and payload ->> 'eventKey' = 'm7b-update-event-1'), 0, 'update producer does not notify its actor');
select is(
  public.emit_action_update_notifications(
    '70000000-0000-4000-8000-000000000002'::uuid,
    'm7b-update-owner',
    array['schedule']::text[],
    'm7b-update-event-1'
  ),
  0,
  'update producer retry detects the same event key'
);
select is(
  public.emit_action_update_notifications(
    '70000000-0000-4000-8000-000000000002'::uuid,
    'm7b-update-owner',
    array['route']::text[],
    'm7b-update-event-2'
  ),
  1,
  'update producer replays a distinct event into the unread group'
);
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-update-recipient' and payload ->> 'subtype' = 'action_update'), 1, 'distinct update retries remain one unread notification');
select is((select jsonb_array_length(payload -> 'eventKeys') from public.app_notifications where user_id = 'm7b-update-recipient' and payload ->> 'subtype' = 'action_update'), 2, 'unread update group preserves both event keys');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-update-recipient' and (payload -> 'changeKinds') ? 'schedule' and (payload -> 'changeKinds') ? 'route'), 1, 'unread update group preserves both change kinds');

-- The gamification RPC, including its advisory transaction lock, is tested
-- directly. A second call is a producer replay, not a direct insert test.
select is(
  (public.apply_gamification_reconciliation(
    'm7b-gamification-owner',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    null,
    '{"reconciliationId":"m7b-reconciliation","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
    null
  ) ->> 'status'),
  'applied',
  'gamification reconciliation producer applies its first receipt'
);
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-gamification-owner' and type = 'gamification_reconciliation'), 1, 'gamification producer persists one receipt');
select is(
  (public.apply_gamification_reconciliation(
    'm7b-gamification-owner',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    null,
    '{"reconciliationId":"m7b-reconciliation","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
    null
  ) ->> 'status'),
  'applied',
  'gamification reconciliation retry remains successful'
);
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-gamification-owner' and type = 'gamification_reconciliation'), 1, 'gamification reconciliation retry does not duplicate the receipt');
select is((select payload ->> 'reconciliationId' from public.app_notifications where user_id = 'm7b-gamification-owner' and type = 'gamification_reconciliation'), 'm7b-reconciliation', 'gamification receipt persists its deterministic identity');
select is(
  (public.apply_gamification_reconciliation(
    'm7b-gamification-no-visible-change',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    null,
    '{"reconciliationId":"m7b-no-visible-change","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":false}'::jsonb,
    null
  ) ->> 'status'),
  'applied',
  'gamification reconciliation without visible changes remains a no-notification success'
);
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-gamification-no-visible-change'), 0, 'gamification producer does not create an unwanted receipt');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"m7b-notification-owner-a"}', true);
select is((select count(*)::integer from public.app_notifications), 1, 'recipient A reads only its private fixture');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-notification-owner-b'), 0, 'recipient A cannot read recipient B notifications');
select is(
  (with changed as (
    update public.app_notifications
       set read_at = timezone('utc', now()),
           seen_at = timezone('utc', now()),
           acknowledged_at = timezone('utc', now())
     where id = '70000000-0000-4000-8000-000000000101'::uuid
     returning id
  ) select count(*)::integer from changed),
  1,
  'recipient A receipt update changes exactly one row'
);
select throws_ok($$update public.app_notifications set title = 'forged' where id = '70000000-0000-4000-8000-000000000101'::uuid$$, '42501', null, 'recipient A cannot rewrite title');
select throws_ok($$update public.app_notifications set content = 'forged' where id = '70000000-0000-4000-8000-000000000101'::uuid$$, '42501', null, 'recipient A cannot rewrite content');
select throws_ok($$update public.app_notifications set payload = '{"forged":true}'::jsonb where id = '70000000-0000-4000-8000-000000000101'::uuid$$, '42501', null, 'recipient A cannot rewrite payload');
select throws_ok($$update public.app_notifications set user_id = 'm7b-notification-owner-b' where id = '70000000-0000-4000-8000-000000000101'::uuid$$, '42501', null, 'recipient A cannot transfer ownership');
select is(
  (with changed as (
    update public.app_notifications
       set read_at = timezone('utc', now())
     where id = '70000000-0000-4000-8000-000000000102'::uuid
     returning id
  ) select count(*)::integer from changed),
  0,
  'recipient A cross-owner update changes zero rows'
);
select throws_ok($$insert into public.app_notifications (user_id, type, title, content) values ('m7b-notification-owner-a', 'system', 'forged', 'forged')$$, '42501', null, 'recipient A cannot manufacture a notification');
select throws_ok($$select * from public.respond_to_action_result_prompt('70000000-0000-4000-8000-000000000001'::uuid, 'm7b-result-recipient-a', 'not_participated')$$, '42501', null, 'authenticated cannot invoke the decision RPC');
select throws_ok($$select * from public.apply_gamification_reconciliation('m7b-notification-owner-a', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::bigint[], null, null, null, null)$$, '42501', null, 'authenticated cannot invoke the reconciliation RPC');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select is((select count(*)::integer from public.app_notifications where id = '70000000-0000-4000-8000-000000000101'::uuid and read_at is not null and seen_at is not null and acknowledged_at is not null), 1, 'privileged read proves recipient A receipt state persisted');
select is((select count(*)::integer from public.app_notifications where id = '70000000-0000-4000-8000-000000000101'::uuid and title = 'M7B receipt A' and content = 'Receipt fixture A' and payload = '{"kind":"m7b_receipt_fixture"}'::jsonb), 1, 'privileged read proves recipient A content stayed server-owned');
select is((select count(*)::integer from public.app_notifications where id = '70000000-0000-4000-8000-000000000102'::uuid and read_at is null and seen_at is null and acknowledged_at is null), 1, 'privileged read proves recipient B was not mutated by recipient A');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"m7b-notification-owner-b"}', true);
select is((select count(*)::integer from public.app_notifications), 1, 'recipient B has an independent private inbox');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-notification-owner-a'), 0, 'recipient B cannot read recipient A notifications');
select is(
  (with changed as (
    update public.app_notifications
       set acknowledged_at = timezone('utc', now())
     where id = '70000000-0000-4000-8000-000000000102'::uuid
     returning id
  ) select count(*)::integer from changed),
  1,
  'recipient B acknowledgement changes exactly one row'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select is((select count(*)::integer from public.app_notifications where id = '70000000-0000-4000-8000-000000000102'::uuid and acknowledged_at is not null and read_at is null and seen_at is null), 1, 'privileged read proves recipient B acknowledgement persisted independently');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select is((select count(*)::integer from public.app_notifications), 0, 'authenticated session without a Clerk subject sees no notifications');
select throws_ok($$select count(*) from public.app_notifications$$, '42501', null, 'session without a subject cannot bypass the private boundary');

reset role;
set local role anon;
select throws_ok($$select count(*) from public.app_notifications$$, '42501', null, 'anon cannot select private notifications');

select * from finish();
rollback;
