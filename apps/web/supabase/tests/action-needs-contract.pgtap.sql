begin;

select plan(36);

select has_table('public', 'action_needs', 'action_needs exists');
select has_index('public', 'action_needs_action_status_created_at_idx', 'action/status index exists');
select has_index('public', 'action_needs_category_status_created_at_idx', 'category/status index exists');
select has_index('public', 'action_needs_open_expires_at_idx', 'open expiration index exists');
select ok(has_column('public', 'action_needs', 'id'), 'id column exists');
select ok(has_column('public', 'action_needs', 'action_id'), 'action_id column exists');
select ok(has_column('public', 'action_needs', 'created_by_clerk_id'), 'creator column exists');
select ok(has_column('public', 'action_needs', 'category'), 'category column exists');
select ok(has_column('public', 'action_needs', 'title'), 'title column exists');
select ok(has_column('public', 'action_needs', 'description'), 'description column exists');
select ok(has_column('public', 'action_needs', 'quantity_label'), 'quantity label column exists');
select ok(has_column('public', 'action_needs', 'expires_at'), 'expiration column exists');
select ok(has_column('public', 'action_needs', 'status'), 'status column exists');
select ok(has_column('public', 'action_needs', 'fulfilled_at'), 'fulfilled_at column exists');
select ok(has_column('public', 'action_needs', 'created_at'), 'created_at column exists');
select ok(has_column('public', 'action_needs', 'updated_at'), 'updated_at column exists');
select ok(has_table_privilege('service_role', 'public.action_needs', 'SELECT'), 'service_role can read needs');
select ok(has_table_privilege('service_role', 'public.action_needs', 'INSERT'), 'service_role can insert needs');
select ok(has_table_privilege('service_role', 'public.action_needs', 'UPDATE'), 'service_role can update needs');
select ok(not has_table_privilege('anon', 'public.action_needs', 'INSERT'), 'anon cannot insert needs');
select ok(not has_table_privilege('authenticated', 'public.action_needs', 'INSERT'), 'authenticated cannot insert needs');
select ok(not has_table_privilege('anon', 'public.action_needs', 'UPDATE'), 'anon cannot update needs');
select ok(not has_table_privilege('authenticated', 'public.action_needs', 'UPDATE'), 'authenticated cannot update needs');
select ok(not has_table_privilege('anon', 'public.action_needs', 'DELETE'), 'anon cannot delete needs');
select ok(not has_table_privilege('authenticated', 'public.action_needs', 'DELETE'), 'authenticated cannot delete needs');
select ok(not has_table_privilege('anon', 'public.action_needs', 'SELECT'), 'anon cannot read needs directly');
select ok(not has_table_privilege('authenticated', 'public.action_needs', 'SELECT'), 'authenticated cannot read needs directly');
select ok(
  not has_function_privilege('anon', 'public.enforce_action_need_lifecycle()', 'EXECUTE'),
  'anon cannot execute the lifecycle trigger function'
);
select ok(
  not has_function_privilege('authenticated', 'public.enforce_action_need_lifecycle()', 'EXECUTE'),
  'authenticated cannot execute the lifecycle trigger function'
);
select ok(
  exists (
    select 1
    from pg_class
    where oid = 'public.action_needs'::regclass
      and relrowsecurity
  ),
  'row level security is enabled'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and contype = 'f'
      and confrelid = 'public.actions'::regclass
      and confdeltype = 'c'
  ),
  'action foreign key cascades on action deletion'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and conname = 'action_needs_category_check'
  ),
  'category constraint exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and conname = 'action_needs_status_check'
  ),
  'status constraint exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and conname = 'action_needs_fulfillment_consistency_check'
  ),
  'fulfilled_at consistency constraint exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and conname = 'action_needs_temporal_consistency_check'
  ),
  'temporal consistency constraint exists'
);
select ok(
  not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.action_needs'::regclass
      and pg_get_constraintdef(oid) ilike '%expired%'
  ),
  'expired is not a persisted status constraint'
);

select * from finish();
rollback;
