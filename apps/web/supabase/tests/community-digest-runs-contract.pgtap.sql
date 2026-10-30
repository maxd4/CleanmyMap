begin;

select plan(32);

select ok(to_regclass('public.community_digest_runs') is not null, 'digest runs table exists');
select ok(has_index('public', 'community_digest_runs_user_cadence_period_key_key'), 'user cadence period uniqueness exists');
select ok(has_column('public.community_digest_runs', 'id'), 'id column exists');
select ok(has_column('public.community_digest_runs', 'user_id'), 'user id column exists');
select ok(has_column('public.community_digest_runs', 'cadence'), 'cadence column exists');
select ok(has_column('public.community_digest_runs', 'period_key'), 'period key column exists');
select ok(has_column('public.community_digest_runs', 'generated_at'), 'generated at column exists');
select ok(has_column('public.community_digest_runs', 'item_count'), 'item count column exists');
select ok(has_column('public.community_digest_runs', 'notification_id'), 'notification id column exists');
select ok((select relrowsecurity from pg_class where oid = 'public.community_digest_runs'::regclass), 'row level security is enabled');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.community_digest_runs'::regclass and conname = 'community_digest_runs_cadence_check'), 'cadence check exists');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.community_digest_runs'::regclass and conname = 'community_digest_runs_item_count_check'), 'item count bound exists');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.community_digest_runs'::regclass and conname = 'community_digest_runs_notification_consistency_check'), 'notification consistency exists');
select ok(has_table_privilege('service_role', 'public.community_digest_runs', 'SELECT'), 'service role can read runs');
select ok(has_table_privilege('service_role', 'public.community_digest_runs', 'INSERT'), 'service role can insert runs');
select ok(not has_table_privilege('authenticated', 'public.community_digest_runs', 'SELECT'), 'authenticated cannot read runs directly');
select ok(not has_table_privilege('authenticated', 'public.community_digest_runs', 'INSERT'), 'authenticated cannot insert runs directly');
select ok(not has_table_privilege('anon', 'public.community_digest_runs', 'SELECT'), 'anon cannot read runs');
select ok(has_function_privilege('service_role', 'public.commit_community_digest_run(text, text, text, jsonb)', 'EXECUTE'), 'service role can call digest commit');
select ok(not has_function_privilege('authenticated', 'public.commit_community_digest_run(text, text, text, jsonb)', 'EXECUTE'), 'authenticated cannot call digest commit');
select ok(not has_function_privilege('anon', 'public.commit_community_digest_run(text, text, text, jsonb)', 'EXECUTE'), 'anon cannot call digest commit');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"digest-server"}', true);
select lives_ok(
  $$select * from public.commit_community_digest_run('digest-owner', 'daily', '2026-01-15', '[]'::jsonb)$$,
  'empty digest run commits without notification'
);
select is((select count(*)::integer from public.community_digest_runs where user_id = 'digest-owner'), 1, 'empty run is persisted once');
select is((select count(*)::integer from public.app_notifications where user_id = 'digest-owner' and payload ->> 'kind' = 'community_digest'), 0, 'empty run creates no notification');
select is((select status from public.commit_community_digest_run('digest-owner', 'daily', '2026-01-15', '[]'::jsonb)), 'already_processed', 'retry is idempotent');
select lives_ok(
  $$select * from public.commit_community_digest_run(
    'digest-owner', 'weekly', '2026-W03',
    '[{"type":"future_actions","id":"action-1","actionId":"action-1","title":"Action publique","actionDate":"2026-01-20","locationLabel":"1er arrondissement"}]'::jsonb
  )$$,
  'non-empty digest creates one notification'
);
select is((select count(*)::integer from public.app_notifications where user_id = 'digest-owner' and payload ->> 'kind' = 'community_digest'), 1, 'non-empty run creates exactly one notification');
select is((select count(*)::integer from public.community_digest_runs where user_id = 'digest-owner' and cadence = 'weekly' and notification_id is not null), 1, 'notification id is linked to the run');
select is((select status from public.commit_community_digest_run('digest-owner', 'weekly', '2026-W03', '[{"type":"future_actions","id":"action-1"}]'::jsonb)), 'already_processed', 'non-empty retry does not duplicate');
select throws_ok($$select * from public.commit_community_digest_run('digest-owner', 'daily', '2026-01-16', '[{"type":"needs","id":"need-1"},{"type":"needs","id":"need-1"}]'::jsonb)$$, '23505', null, 'duplicate references are rejected');
select throws_ok($$select * from public.commit_community_digest_run('digest-owner', 'daily', '2026-01-17', '[{"type":"private","id":"secret-1"}]'::jsonb)$$, '23514', null, 'unknown reference types are rejected');
select throws_ok($$select * from public.commit_community_digest_run('digest-owner', 'daily', '2026-01-18', jsonb_build_array(1,2,3,4,5,6,7,8,9,10,11))$$, '22023', null, 'payload is capped at ten references');

reset role;
select * from finish();
rollback;
