begin;

select plan(22);

-- The inbox is server-produced and user-owned. These checks run against the
-- ephemeral Supabase database in CI, so they prove database behavior rather
-- than only the migration text or a mocked client.
select ok(not has_table_privilege('anon', 'public.app_notifications', 'SELECT'), 'anon cannot read notifications');
select ok(has_table_privilege('authenticated', 'public.app_notifications', 'SELECT'), 'authenticated can read notifications');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'read_at', 'UPDATE'), 'owner can mark a notification read');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'seen_at', 'UPDATE'), 'owner can mark a notification seen');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'acknowledged_at', 'UPDATE'), 'owner can acknowledge a notification');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'title', 'UPDATE'), 'owner cannot rewrite notification title');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'payload', 'UPDATE'), 'owner cannot rewrite notification payload');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'user_id', 'UPDATE'), 'owner cannot transfer notification ownership');
select ok(not has_table_privilege('authenticated', 'public.app_notifications', 'INSERT'), 'authenticated cannot manufacture notifications');
select ok(has_table_privilege('service_role', 'public.app_notifications', 'INSERT'), 'service role can produce notifications');
select ok(to_regclass('public.app_notifications_action_update_event_unique_idx') is not null, 'action update notifications have a stable dedupe index');
select ok(to_regclass('public.app_notifications_gamification_reconciliation_id_idx') is not null, 'gamification receipts have a stable dedupe index');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);

insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-a', 'action_event', 'Action update', 'Update', '{"subtype":"action_update","eventKey":"m7b-action-event"}'::jsonb);
insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-a', 'action_event', 'Action update duplicate', 'Duplicate', '{"subtype":"action_update","eventKey":"m7b-action-event"}'::jsonb)
on conflict do nothing;
insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-b', 'action_event', 'Action update other owner', 'Other owner', '{"subtype":"action_update","eventKey":"m7b-action-event"}'::jsonb)
on conflict do nothing;
select is((select count(*)::integer from public.app_notifications where type = 'action_event' and payload ->> 'eventKey' = 'm7b-action-event'), 2, 'action update retry deduplicates per owner without suppressing another owner');

insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-a', 'gamification_reconciliation', 'Reconciliation', 'Receipt', '{"reconciliationId":"m7b-reconciliation"}'::jsonb);
insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-a', 'gamification_reconciliation', 'Reconciliation duplicate', 'Duplicate', '{"reconciliationId":"m7b-reconciliation"}'::jsonb)
on conflict do nothing;
insert into public.app_notifications (user_id, type, title, content, payload)
values ('m7b-user-b', 'gamification_reconciliation', 'Reconciliation other owner', 'Other owner', '{"reconciliationId":"m7b-reconciliation"}'::jsonb)
on conflict do nothing;
select is((select count(*)::integer from public.app_notifications where type = 'gamification_reconciliation' and payload ->> 'reconciliationId' = 'm7b-reconciliation'), 2, 'gamification reconciliation retry deduplicates per owner without suppressing another owner');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"m7b-user-a"}', true);
select is((select count(*)::integer from public.app_notifications), 2, 'owner sees only the two own notifications');
select is((select count(*)::integer from public.app_notifications where user_id = 'm7b-user-b'), 0, 'owner cannot read another recipient notifications');
select lives_ok($$update public.app_notifications set read_at = now(), seen_at = now(), acknowledged_at = now()$$, 'owner can update only receipt state');
select throws_ok($$update public.app_notifications set title = 'forged'$$, '42501', null, 'owner cannot rewrite notification content');
select throws_ok($$update public.app_notifications set payload = '{"forged":true}'::jsonb$$, '42501', null, 'owner cannot rewrite notification decision payload');
select lives_ok($$update public.app_notifications set read_at = now() where user_id = 'm7b-user-b'$$, 'cross-owner update affects no rows');
select throws_ok($$insert into public.app_notifications (user_id, type, title, content) values ('m7b-user-a', 'system', 'forged', 'forged')$$, '42501', null, 'authenticated cannot insert an unauthorized notification');

select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select is((select count(*)::integer from public.app_notifications), 0, 'an authenticated session without a subject sees no notifications');

select * from finish();
rollback;
