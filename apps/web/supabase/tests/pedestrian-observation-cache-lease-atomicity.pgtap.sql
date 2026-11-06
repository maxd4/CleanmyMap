-- Ephemeral PostgreSQL contract for observation-cache lease atomicity.
-- Never execute this fixture against the linked or production project.

begin;
select plan(24);

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
select set_config('request.jwt.claim.role', 'service_role', true);

insert into public.pedestrian_risk_cache_invalidation_events (
  event_key, source_table, operation, reason, source_updated_at, status,
  attempts, locked_at, locked_by, lease_token, lease_expires_at
)
values
  ('lease-contract-valid', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-a', '00000000-0000-4000-8000-000000000001', clock_timestamp() + interval '5 minutes'),
  ('lease-contract-expired', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-a', '00000000-0000-4000-8000-000000000002', clock_timestamp() - interval '1 second'),
  ('lease-contract-batch-a', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-a', '00000000-0000-4000-8000-000000000003', clock_timestamp() + interval '5 minutes'),
  ('lease-contract-batch-b', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-a', '00000000-0000-4000-8000-000000000003', clock_timestamp() - interval '1 second'),
  ('lease-contract-old-token', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-a', '00000000-0000-4000-8000-000000000004', clock_timestamp() + interval '5 minutes'),
  ('lease-contract-reassigned', 'system', 'rebuild', 'model', clock_timestamp(), 'processing', 1, clock_timestamp(), 'worker-b', '00000000-0000-4000-8000-000000000005', clock_timestamp() + interval '5 minutes');

select lives_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[(select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-valid')],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000001'
  )$$,
  'failure release succeeds before the lease expires'
);
select is(
  (select status from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-valid'),
  'pending',
  'valid failure release resets the event atomically'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[(select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-expired')],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000002'
  )$$,
  'P0001', 'invalidation lease is not owned by worker',
  'failure release rejects an already expired lease'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[
      (select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-batch-a'),
      (select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-batch-b')
    ],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000003'
  )$$,
  'P0001', 'invalidation lease is not owned by worker',
  'one expired event rejects the complete failure batch'
);
select is(
  (select count(*) from public.pedestrian_risk_cache_invalidation_events where event_key in ('lease-contract-batch-a', 'lease-contract-batch-b') and status = 'processing'),
  2::bigint,
  'an expired batch leaves every event unreleased'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[(select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-old-token')],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000099'
  )$$,
  'P0001', 'invalidation lease is not owned by worker',
  'failure release rejects an old lease token'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[(select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-reassigned')],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000005'
  )$$,
  'P0001', 'invalidation lease is not owned by worker',
  'failure release rejects a reassigned worker'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[
      (select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-old-token'),
      (select id from public.pedestrian_risk_cache_invalidation_events where event_key = 'lease-contract-old-token')
    ],
    'failure', 'worker-a', '00000000-0000-4000-8000-000000000004'
  )$$,
  'P0001', 'invalidation lease is incomplete',
  'failure release rejects duplicated event identifiers'
);
select throws_ok(
  $$select public.fail_pedestrian_observation_invalidation_events(
    array[999999999], 'failure', 'worker-a', '00000000-0000-4000-8000-000000000004'
  )$$,
  'P0001', 'invalidation lease is incomplete',
  'failure release rejects a missing event'
);
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
