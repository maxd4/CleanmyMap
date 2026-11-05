-- Ephemeral PostgreSQL contract for observation-cache lease atomicity.
-- Never execute this fixture against the linked or production project.

begin;
select plan(15);

set local role postgres;
select ok(to_regprocedure('public.claim_pedestrian_observation_invalidation_events(text,integer,integer)') is not null, 'claim RPC exists');
select ok(to_regprocedure('public.publish_pedestrian_observation_cache(uuid,timestamptz,jsonb,jsonb,bigint[],text[],text,uuid)') is not null, 'lease-bound publish RPC exists');
select ok(to_regprocedure('public.refresh_pedestrian_observation_cache(uuid,bigint[],text,uuid)') is not null, 'lease-bound refresh RPC exists');
select ok(to_regprocedure('public.fail_pedestrian_observation_invalidation_events(bigint[],text,text,uuid)') is not null, 'lease-bound failure RPC exists');
select ok((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'pedestrian_risk_cache_invalidation_events' and column_name in ('lease_token', 'lease_expires_at')) = 2, 'event rows persist acquisition identity and expiry');
select ok(has_function_privilege('service_role', 'public.publish_pedestrian_observation_cache(uuid,timestamptz,jsonb,jsonb,bigint[],text[],text,uuid)', 'EXECUTE'), 'service_role can publish');
select ok(has_function_privilege('service_role', 'public.refresh_pedestrian_observation_cache(uuid,bigint[],text,uuid)', 'EXECUTE'), 'service_role can refresh');
select ok(has_function_privilege('service_role', 'public.fail_pedestrian_observation_invalidation_events(bigint[],text,text,uuid)', 'EXECUTE'), 'service_role can release a failed lease');
select ok(not has_function_privilege('anon', 'public.publish_pedestrian_observation_cache(uuid,timestamptz,jsonb,jsonb,bigint[],text[],text,uuid)', 'EXECUTE'), 'anon cannot publish');
select ok(not has_function_privilege('authenticated', 'public.publish_pedestrian_observation_cache(uuid,timestamptz,jsonb,jsonb,bigint[],text[],text,uuid)', 'EXECUTE'), 'authenticated cannot publish');
select ok(not has_function_privilege('anon', 'public.refresh_pedestrian_observation_cache(uuid,bigint[],text,uuid)', 'EXECUTE'), 'anon cannot refresh');
select ok(not has_function_privilege('authenticated', 'public.refresh_pedestrian_observation_cache(uuid,bigint[],text,uuid)', 'EXECUTE'), 'authenticated cannot refresh');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select throws_ok(
  $$select public.publish_pedestrian_observation_cache('00000000-0000-4000-8000-000000000000', clock_timestamp(), '[]'::jsonb, '{}'::jsonb, '{}'::bigint[], null, 'worker-a', '00000000-0000-4000-8000-000000000001')$$,
  'P0001', 'invalidation lease requires events', 'publish rejects an empty event list before cache mutation'
);
select throws_ok(
  $$select public.refresh_pedestrian_observation_cache('00000000-0000-4000-8000-000000000000', '{}'::bigint[], 'worker-a', '00000000-0000-4000-8000-000000000001')$$,
  'P0001', 'invalidation lease requires events', 'refresh rejects an empty event list'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events('{}'::bigint[], 'failure', 'worker-a', '00000000-0000-4000-8000-000000000001')$$,
  'P0001', 'invalidation lease requires events', 'failure release rejects an empty event list'
);

select * from finish();
rollback;
