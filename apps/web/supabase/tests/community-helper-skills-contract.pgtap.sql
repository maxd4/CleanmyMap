begin;

select plan(38);

select has_table(
  'public',
  'community_helper_skills',
  'community helper skills table exists'
);
select has_index(
  'public',
  'community_helper_skills_pkey',
  'user and category primary key exists'
);
select ok(has_column('public.community_helper_skills', 'user_id'), 'user id column exists');
select ok(has_column('public.community_helper_skills', 'category'), 'category column exists');
select ok(has_column('public.community_helper_skills', 'created_at'), 'created at column exists');
select ok(has_column('public.community_helper_skills', 'updated_at'), 'updated at column exists');
select ok(
  exists (
    select 1
    from pg_class
    where oid = 'public.community_helper_skills'::regclass
      and relrowsecurity
  ),
  'row level security is enabled for helper skills'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.community_helper_skills'::regclass
      and conname = 'community_helper_skills_category_check'
  ),
  'exact category check exists'
);
select ok(has_table_privilege('authenticated', 'public.community_helper_skills', 'SELECT'), 'authenticated can read owner rows');
select ok(not has_table_privilege('authenticated', 'public.community_helper_skills', 'INSERT'), 'authenticated cannot insert helper rows directly');
select ok(not has_table_privilege('authenticated', 'public.community_helper_skills', 'UPDATE'), 'authenticated cannot update helper rows directly');
select ok(not has_table_privilege('authenticated', 'public.community_helper_skills', 'DELETE'), 'authenticated cannot delete helper rows directly');
select ok(has_table_privilege('service_role', 'public.community_helper_skills', 'SELECT'), 'service role can read helper rows');
select ok(has_table_privilege('service_role', 'public.community_helper_skills', 'INSERT'), 'service role can insert helper rows');
select ok(has_table_privilege('service_role', 'public.community_helper_skills', 'UPDATE'), 'service role can update helper rows');
select ok(has_table_privilege('service_role', 'public.community_helper_skills', 'DELETE'), 'service role can delete helper rows');
select ok(not has_table_privilege('anon', 'public.community_helper_skills', 'SELECT'), 'anon cannot read helper skills');
select ok(not has_table_privilege('anon', 'public.community_helper_skills', 'INSERT'), 'anon cannot insert helper skills');
select ok(not has_table_privilege('anon', 'public.community_helper_skills', 'UPDATE'), 'anon cannot update helper skills');
select ok(not has_table_privilege('anon', 'public.community_helper_skills', 'DELETE'), 'anon cannot delete helper skills');
select ok(has_function_privilege('service_role', 'public.replace_community_helper_skills(text, text[])', 'EXECUTE'), 'service role can replace helper skills');
select ok(not has_function_privilege('authenticated', 'public.replace_community_helper_skills(text, text[])', 'EXECUTE'), 'authenticated cannot call server replacement RPC');

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role","sub":"helper-one"}',
  true
);
select lives_ok(
  $$select public.replace_community_helper_skills(
    'helper-one',
    array['materiel', 'transport']::text[]
  )$$,
  'service replacement accepts the exact category taxonomy'
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  2,
  'replacement persists the complete selected set'
);
select is(
  (select string_agg(category, ',' order by category) from public.community_helper_skills where user_id = 'helper-one'),
  'materiel,transport',
  'replacement persists only selected categories'
);
select lives_ok(
  $$select public.replace_community_helper_skills('helper-one', array[]::text[])$$,
  'empty replacement is an explicit opt-out'
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  0,
  'empty replacement removes the previous set atomically'
);
select lives_ok(
  $$select public.replace_community_helper_skills('helper-one', array['materiel', 'transport']::text[])$$,
  'replacement restores a baseline before invalid input'
);
select throws_ok(
  $$select public.replace_community_helper_skills('helper-one', array['inconnue']::text[])$$,
  '23514', null,
  'unknown category is rejected'
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  2,
  'invalid category leaves the previous replacement unchanged'
);
select is(
  (select string_agg(category, ',' order by category) from public.community_helper_skills where user_id = 'helper-one'),
  'materiel,transport',
  'invalid category failure is atomic'
);
select throws_ok(
  $$select public.replace_community_helper_skills('helper-one', array['materiel', 'materiel']::text[])$$,
  '23505', null,
  'duplicate categories are rejected'
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  2,
  'duplicate category failure leaves the previous replacement unchanged'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"helper-one"}',
  true
);
select throws_ok(
  $$insert into public.community_helper_skills (user_id, category)
    values ('helper-one', 'logistique')$$,
  '42501', null,
  'authenticated cannot write its own category directly'
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  2,
  'owner can read its private category'
);
select throws_ok(
  $$update public.community_helper_skills
    set category = 'logistique'
    where user_id = 'helper-one' and category = 'materiel'$$,
  '42501', null,
  'authenticated cannot update its own category directly'
);
select throws_ok(
  $$delete from public.community_helper_skills where user_id = 'helper-one'$$,
  '42501', null,
  'authenticated cannot delete its own categories directly'
);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"helper-two"}',
  true
);
select is(
  (select count(*)::integer from public.community_helper_skills where user_id = 'helper-one'),
  0,
  'another member cannot read the private category'
);

select * from finish();
rollback;
