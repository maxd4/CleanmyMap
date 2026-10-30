begin;

select plan(71);

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

-- Behavioural proof. All fixtures run as service_role because direct table
-- writes are intentionally unavailable to browser roles. The surrounding
-- transaction rolls every fixture back after the assertions.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', 'system', true);

insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
values (
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner',
  current_date + 30,
  'Action needs behaviour fixture',
  'pending'
);

insert into public.action_needs (
  id, action_id, created_by_clerk_id, category, title, description,
  quantity_label, expires_at
)
values (
  '90000000-0000-4000-8000-000000000101',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner',
  'materiel',
  'Gants de collecte',
  'Prévoir des gants pour le groupe.',
  '10 paires',
  now() + interval '1 hour'
);
select is(
  (select status from public.action_needs where id = '90000000-0000-4000-8000-000000000101'),
  'open',
  'valid action need insert persists open'
);

select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000102', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'unknown', 'Titre valide', 'Description valide')$$,
  '23514', null, 'unknown category is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000103', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'ab', 'Description valide')$$,
  '23514', null, 'title shorter than three characters is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000104', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', repeat('x', 81), 'Description valide')$$,
  '23514', null, 'title longer than eighty characters is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000105', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', '')$$,
  '23514', null, 'empty description is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000106', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', repeat('x', 501))$$,
  '23514', null, 'description longer than five hundred characters is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, quantity_label)
    values ('90000000-0000-4000-8000-000000000107', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', repeat('x', 81))$$,
  '23514', null, 'quantity label longer than eighty characters is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, status)
    values ('90000000-0000-4000-8000-000000000108', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', 'bogus')$$,
  '23514', null, 'unknown persisted status is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, status)
    values ('90000000-0000-4000-8000-000000000109', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', 'expired')$$,
  '23514', null, 'expired is rejected as a persisted status'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, created_at, expires_at)
    values ('90000000-0000-4000-8000-000000000110', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', '2026-10-30 10:00:00+00', '2026-10-30 09:00:00+00')$$,
  '23514', null, 'expiration before creation is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, created_at, status, fulfilled_at)
    values ('90000000-0000-4000-8000-000000000111', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', '2026-10-30 10:00:00+00', 'fulfilled', '2026-10-30 09:00:00+00')$$,
  '23514', null, 'fulfilled timestamp before creation is rejected'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, status)
    values ('90000000-0000-4000-8000-000000000112', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', 'fulfilled')$$,
  '23514', null, 'fulfilled requires fulfilled_at'
);
select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, fulfilled_at)
    values ('90000000-0000-4000-8000-000000000113', '90000000-0000-4000-8000-000000000001', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide', now())$$,
  '23514', null, 'non-fulfilled status cannot carry fulfilled_at'
);

update public.action_needs
set status = 'fulfilled', fulfilled_at = now()
where id = '90000000-0000-4000-8000-000000000101';
select is(
  (select status from public.action_needs where id = '90000000-0000-4000-8000-000000000101'),
  'fulfilled',
  'open transitions to fulfilled'
);
select ok(
  (select fulfilled_at is not null from public.action_needs where id = '90000000-0000-4000-8000-000000000101'),
  'fulfilled transition stores fulfilled_at'
);
select throws_ok(
  $$update public.action_needs set title = 'Tentative de modification' where id = '90000000-0000-4000-8000-000000000101'$$,
  '23514', null, 'fulfilled need cannot be modified'
);
select throws_ok(
  $$update public.action_needs set status = 'open' where id = '90000000-0000-4000-8000-000000000101'$$,
  '23514', null, 'fulfilled need cannot be reopened'
);

insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
values (
  '90000000-0000-4000-8000-000000000114',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner', 'transport', 'Chariot', 'Prévoir un chariot.'
);
update public.action_needs
set status = 'cancelled'
where id = '90000000-0000-4000-8000-000000000114';
select is(
  (select status from public.action_needs where id = '90000000-0000-4000-8000-000000000114'),
  'cancelled',
  'open transitions to cancelled'
);
select ok(
  (select fulfilled_at is null from public.action_needs where id = '90000000-0000-4000-8000-000000000114'),
  'cancelled transition keeps fulfilled_at null'
);
select throws_ok(
  $$update public.action_needs set title = 'Tentative de modification' where id = '90000000-0000-4000-8000-000000000114'$$,
  '23514', null, 'cancelled need cannot be modified'
);
select throws_ok(
  $$update public.action_needs set status = 'open' where id = '90000000-0000-4000-8000-000000000114'$$,
  '23514', null, 'cancelled need cannot be reopened'
);

insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, expires_at)
values (
  '90000000-0000-4000-8000-000000000115',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner', 'logistique', 'Besoin expiré', 'Ce besoin est expiré.',
  now() - interval '1 second'
);
select throws_ok(
  $$update public.action_needs set title = 'Réouverture implicite' where id = '90000000-0000-4000-8000-000000000115'$$,
  '23514', null, 'expired open need cannot be modified'
);
select throws_ok(
  $$update public.action_needs set status = 'fulfilled', fulfilled_at = now() where id = '90000000-0000-4000-8000-000000000115'$$,
  '23514', null, 'expired open need cannot transition to fulfilled'
);
select throws_ok(
  $$update public.action_needs set expires_at = now() + interval '1 day' where id = '90000000-0000-4000-8000-000000000115'$$,
  '23514', null, 'expired open need cannot have its expiration moved forward'
);
update public.action_needs
set status = 'cancelled'
where id = '90000000-0000-4000-8000-000000000115';
select is(
  (select status from public.action_needs where id = '90000000-0000-4000-8000-000000000115'),
  'cancelled',
  'expired open need can be explicitly cancelled'
);
select throws_ok(
  $$update public.action_needs set title = 'Modification après annulation' where id = '90000000-0000-4000-8000-000000000115'$$,
  '23514', null, 'cancelled expired need remains immutable'
);

insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description, expires_at)
values (
  '90000000-0000-4000-8000-000000000116',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner', 'expertise', 'Frontière exacte', 'La frontière now est exacte.',
  now()
);
update public.action_needs
set status = 'fulfilled', fulfilled_at = now()
where id = '90000000-0000-4000-8000-000000000116';
select is(
  (select status from public.action_needs where id = '90000000-0000-4000-8000-000000000116'),
  'fulfilled',
  'expires_at exactly equal to now is not expired'
);
select ok(
  (select fulfilled_at is not null from public.action_needs where id = '90000000-0000-4000-8000-000000000116'),
  'exact expiration boundary keeps fulfillment timestamp coherent'
);

select throws_ok(
  $$insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000117', '90000000-0000-4000-8000-000000000099', 'action-needs-test-owner', 'materiel', 'Titre valide', 'Description valide')$$,
  '23503', null, 'unknown action foreign key is rejected'
);
insert into public.action_needs (id, action_id, created_by_clerk_id, category, title, description)
values (
  '90000000-0000-4000-8000-000000000118',
  '90000000-0000-4000-8000-000000000001',
  'action-needs-test-owner', 'materiel', 'Cascade', 'La suppression doit cascader.'
);
delete from public.actions where id = '90000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.action_needs where action_id = '90000000-0000-4000-8000-000000000001'),
  0,
  'deleting an action cascades its needs'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$insert into public.action_needs (action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000001', 'forged-anon', 'materiel', 'Titre valide', 'Description valide')$$,
  '42501', null, 'anon direct insert is rejected'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"forged-authenticated"}', true);
select throws_ok(
  $$insert into public.action_needs (action_id, created_by_clerk_id, category, title, description)
    values ('90000000-0000-4000-8000-000000000001', 'forged-authenticated', 'materiel', 'Titre valide', 'Description valide')$$,
  '42501', null, 'authenticated direct insert is rejected'
);
select throws_ok(
  $$update public.action_needs set title = 'Écriture directe' where id = '90000000-0000-4000-8000-000000000101'$$,
  '42501', null, 'authenticated direct update is rejected'
);
select throws_ok(
  $$delete from public.action_needs where id = '90000000-0000-4000-8000-000000000101'$$,
  '42501', null, 'authenticated direct delete is rejected'
);
select throws_ok(
  $$select id from public.action_needs limit 1$$,
  '42501', null, 'authenticated direct select is rejected'
);
reset role;

select * from finish();
rollback;
