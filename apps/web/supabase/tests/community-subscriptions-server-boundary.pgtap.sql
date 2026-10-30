begin;

select plan(20);

select has_table(
  'public',
  'community_subscriptions',
  'community subscriptions table exists'
);
select has_index(
  'public',
  'community_subscriptions_user_territory_unique_idx',
  'territory subscription uniqueness remains enforced'
);
select has_index(
  'public',
  'community_subscriptions_user_topic_unique_idx',
  'topic subscription uniqueness remains enforced'
);
select ok(
  has_table_privilege('authenticated', 'public.community_subscriptions', 'SELECT'),
  'authenticated retains owner-scoped reads'
);
select ok(
  has_table_privilege('service_role', 'public.community_subscriptions', 'SELECT'),
  'service_role retains subscription reads'
);
select ok(
  has_table_privilege('service_role', 'public.community_subscriptions', 'INSERT'),
  'service_role retains subscription inserts'
);
select ok(
  has_table_privilege('service_role', 'public.community_subscriptions', 'UPDATE'),
  'service_role retains subscription updates'
);
select ok(
  has_table_privilege('service_role', 'public.community_subscriptions', 'DELETE'),
  'service_role retains subscription deletes'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_subscriptions', 'INSERT'),
  'authenticated cannot insert subscriptions directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_subscriptions', 'UPDATE'),
  'authenticated cannot update subscriptions directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_subscriptions', 'DELETE'),
  'authenticated cannot delete subscriptions directly'
);
select ok(
  not has_table_privilege('anon', 'public.community_subscriptions', 'SELECT'),
  'anon cannot read subscriptions directly'
);
select ok(
  not has_table_privilege('anon', 'public.community_subscriptions', 'INSERT'),
  'anon cannot insert subscriptions directly'
);

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role","sub":"subscription-owner"}',
  true
);
select lives_ok(
  $$insert into public.community_subscriptions
      (id, user_id, kind, territory_zone_name, topic_id, cadence, enabled)
    values
      ('00000000-0000-4000-8000-000000000021', 'subscription-owner', 'territory', '1er arrondissement', null, 'weekly', true)$$,
  'service_role can persist a canonical territory subscription'
);
select throws_ok(
  $$insert into public.community_subscriptions
      (user_id, kind, territory_zone_name, topic_id, cadence, enabled)
    values
      ('subscription-owner', 'territory', '1er arrondissement', null, 'daily', true)$$,
  '23505',
  null,
  'the existing territory uniqueness remains enforced'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"subscription-owner"}',
  true
);
select is(
  (select count(*)::integer
   from public.community_subscriptions
   where id = '00000000-0000-4000-8000-000000000021'),
  1,
  'the owner can read their private subscription'
);
select throws_ok(
  $$insert into public.community_subscriptions
      (user_id, kind, territory_zone_name, topic_id, cadence, enabled)
    values
      ('subscription-owner', 'territory', '1er arrondissement', null, 'weekly', true)$$,
  '42501',
  null,
  'authenticated cannot bypass the server insert boundary'
);
select throws_ok(
  $$update public.community_subscriptions
    set cadence = 'daily'
    where id = '00000000-0000-4000-8000-000000000021'$$,
  '42501',
  null,
  'authenticated cannot bypass the server update boundary'
);
select throws_ok(
  $$delete from public.community_subscriptions
    where id = '00000000-0000-4000-8000-000000000021'$$,
  '42501',
  null,
  'authenticated cannot bypass the server delete boundary'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"subscription-outsider"}',
  true
);
select is(
  (select count(*)::integer
   from public.community_subscriptions
   where id = '00000000-0000-4000-8000-000000000021'),
  0,
  'another authenticated member cannot read the private subscription'
);

select * from finish();
rollback;
