begin;

select plan(16);

select ok(
  has_function_privilege(
    'anon',
    'public.action_collection_context_reference_averages_v1()',
    'EXECUTE'
  ),
  'anon retains the historical zero-argument RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.action_collection_context_reference_averages_v1()',
    'EXECUTE'
  ),
  'authenticated retains the historical zero-argument RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.action_collection_context_reference_averages_v1(date)',
    'EXECUTE'
  ),
  'anon cannot execute the dated RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.action_collection_context_reference_averages_v1(date)',
    'EXECUTE'
  ),
  'authenticated cannot execute the dated RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.action_collection_context_reference_averages_v1(date)',
    'EXECUTE'
  ),
  'service_role retains the dated RPC'
);
select ok(
  coalesce((select prosecdef from pg_proc where oid = 'public.action_collection_context_reference_averages_v1()'::regprocedure), false),
  'the public compatibility wrapper is SECURITY DEFINER'
);
select ok(
  not coalesce((select prosecdef from pg_proc where oid = 'public.action_collection_context_reference_averages_v1(date)'::regprocedure), true),
  'the dated RPC remains SECURITY INVOKER'
);
select ok(
  pg_get_functiondef('public.action_collection_context_reference_averages_v1()'::regprocedure)
    like '%public.action_collection_context_reference_averages_v1(current_date)%',
  'the public wrapper delegates to the dated implementation'
);

select ok(
  not exists (
    select 1
    from public.action_collection_context_reference_averages_v1() reference
    where (reference.waste_per_effective_unit is not null
      and reference.waste_source_count < 2)
      or (reference.butts_per_effective_unit is not null
        and reference.butts_source_count < 2)
  ),
  'the public wrapper never exposes a metric with fewer than two sources'
);

select is(
  (select coalesce(jsonb_agg(to_jsonb(reference) order by reference.action_context), '[]'::jsonb)
   from public.action_collection_context_reference_averages_v1() reference),
  (select coalesce(jsonb_agg(to_jsonb(reference) order by reference.action_context), '[]'::jsonb)
   from public.action_collection_context_reference_averages_v1(current_date) reference),
  'both overloads return the same current-date aggregate'
);

set local role anon;
select lives_ok(
  $$select * from public.action_collection_context_reference_averages_v1()$$,
  'anon can execute the historical RPC through the public role'
);
select throws_ok(
  $$select * from public.action_collection_context_reference_averages_v1(current_date)$$,
  '42501',
  null,
  'anon is refused by the dated RPC'
);
reset role;

set local role authenticated;
select lives_ok(
  $$select * from public.action_collection_context_reference_averages_v1()$$,
  'authenticated can execute the historical RPC through the public role'
);
select throws_ok(
  $$select * from public.action_collection_context_reference_averages_v1(current_date)$$,
  '42501',
  null,
  'authenticated is refused by the dated RPC'
);
reset role;

set local role service_role;
select lives_ok(
  $$select * from public.action_collection_context_reference_averages_v1(current_date)$$,
  'service_role can execute the dated RPC'
);
select ok(
  not exists (
    select 1
    from public.action_collection_context_reference_averages_v1(current_date) reference
    where (reference.waste_per_effective_unit is not null
      and reference.waste_source_count < 2)
      or (reference.butts_per_effective_unit is not null
        and reference.butts_source_count < 2)
  ),
  'published metrics never expose a source count below two'
);
reset role;

select * from finish();
rollback;
