begin;

select plan(11);

select ok(
  not has_table_privilege('anon', 'public.newsletter_subscriptions', 'INSERT'),
  'anon cannot insert newsletter subscriptions through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.newsletter_subscriptions', 'INSERT'),
  'authenticated cannot insert newsletter subscriptions through the Data API'
);
select ok(
  has_table_privilege('service_role', 'public.newsletter_subscriptions', 'INSERT'),
  'service_role retains the server newsletter write capability'
);
select ok(
  has_table_privilege('service_role', 'public.newsletter_subscriptions', 'UPDATE'),
  'service_role retains the existing upsert update capability'
);
select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'newsletter_subscriptions'
     and cmd = 'INSERT'),
  0,
  'newsletter subscriptions expose no INSERT policy to application roles'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"newsletter-test"}', true);
select lives_ok(
  $$insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
    values ('newsletter-boundary@example.org', true, 'pgtap', 'active')$$,
  'the server role can persist a validated subscription'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
    values ('anon-bypass@example.org', true, 'direct', 'active')$$,
  '42501', null,
  'anon cannot bypass the newsletter route'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"newsletter-user"}', true);
select throws_ok(
  $$insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
    values ('authenticated-bypass@example.org', true, 'direct', 'active')$$,
  '42501', null,
  'authenticated cannot bypass the newsletter route'
);

set local role service_role;
select is(
  (select count(*)::integer from public.newsletter_subscriptions where email = 'newsletter-boundary@example.org'),
  1,
  'rejected application writes do not create rows'
);
select lives_ok(
  $$insert into public.newsletter_subscriptions (email, gdpr_consent, source, status)
    values ('newsletter-boundary@example.org', true, 'pgtap-retry', 'active')
    on conflict (email) do update set source = excluded.source$$,
  'the existing unique email upsert remains available to the server'
);
select is(
  (select count(*)::integer from public.newsletter_subscriptions where email = 'newsletter-boundary@example.org'),
  1,
  'a repeated server subscription remains idempotent'
);

select * from finish();
rollback;
