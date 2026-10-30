begin;

select plan(51);

select has_table('public', 'action_need_offers', 'action need offers table exists');
select ok(has_column('public.action_need_offers', 'need_id'), 'need foreign key column exists');
select ok(has_column('public.action_need_offers', 'offered_by_clerk_id'), 'offer author column exists');
select ok(has_column('public.action_need_offers', 'message'), 'offer message column exists');
select ok(has_column('public.action_need_offers', 'status'), 'offer status column exists');
select has_index('public', 'action_need_offers_active_member_unique_idx', 'active offer uniqueness exists');
select has_index('public', 'action_need_offer_acceptance_notification_unique_idx', 'acceptance notification uniqueness exists');
select ok(
  exists (select 1 from pg_class where oid = 'public.action_need_offers'::regclass and relrowsecurity),
  'row level security is enabled for offers'
);
select ok(has_table_privilege('service_role', 'public.action_need_offers', 'SELECT'), 'service role can read offers');
select ok(not has_table_privilege('service_role', 'public.action_need_offers', 'INSERT'), 'service role cannot bypass the offer RPC with direct insert');
select ok(not has_table_privilege('authenticated', 'public.action_need_offers', 'SELECT'), 'authenticated cannot read offers directly');
select ok(not has_table_privilege('authenticated', 'public.action_need_offers', 'INSERT'), 'authenticated cannot insert offers directly');
select ok(has_function_privilege('service_role', 'public.create_action_need_offer(uuid, text, text)', 'EXECUTE'), 'service role can execute offer creation');
select ok(has_function_privilege('service_role', 'public.transition_action_need_offer(uuid, uuid, text, text)', 'EXECUTE'), 'service role can execute offer transitions');
select ok(not has_function_privilege('authenticated', 'public.transition_action_need_offer(uuid, uuid, text, text)', 'EXECUTE'), 'authenticated cannot execute offer transitions');
select ok(to_regprocedure('public.transition_action_need_offer(uuid, text, text)') is null, 'the legacy transition signature is not executable');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.action_need_offers'::regclass
      and contype = 'f'
      and confrelid = 'public.action_needs'::regclass
      and confdeltype = 'c'
  ),
  'need foreign key cascades'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.action_need_offers'::regclass and conname = 'action_need_offers_status_check'),
  'offer status constraint exists'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.action_need_offers'::regclass and conname = 'action_need_offers_message_length_check'),
  'message length constraint exists'
);
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'public.action_need_offers'::regclass and tgname = 'action_need_offers_lifecycle_guard'),
  'offer lifecycle trigger exists'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"offer-manager"}', true);

select lives_ok(
  $$insert into public.actions (
      id, created_by_clerk_id, action_date, location_label, status,
      action_phase, published_at, moderation_visibility, review_state,
      access_mode, event_start_time
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'offer-manager', '2099-10-30',
      'Paris', 'pending', 'pre_action', now(), 'visible', 'not_required',
      'public', '10:00:00'
    )$$,
  'fixture action is public and future'
);
select lives_ok(
  $$insert into public.action_needs (
      id, action_id, created_by_clerk_id, category, title, description
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'offer-manager', 'materiel', 'Gants', 'Prévoir des gants.'
    )$$,
  'fixture need is open'
);
select lives_ok(
  $$select public.create_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-1', 'Je peux aider.'
    )$$,
  'server RPC creates a pending offer'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
  'pending',
  'new offer starts pending'
);
select throws_ok(
  $$select public.create_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-1', 'Deuxième offre'
    )$$,
  '23505', null,
  'the active partial unique index rejects a duplicate member offer'
);

select lives_ok(
  $$insert into public.actions (
      id, created_by_clerk_id, action_date, location_label, status,
      action_phase, published_at, moderation_visibility, review_state,
      access_mode, event_start_time
    ) values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'offer-manager', '2099-10-31',
      'Lyon', 'pending', 'pre_action', now(), 'visible', 'not_required',
      'public', '11:00:00'
    )$$,
  'second fixture action exists for mismatch checks'
);
select lives_ok(
  $$insert into public.action_needs (
      id, action_id, created_by_clerk_id, category, title, description
    ) values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'offer-manager', 'materiel', 'Gilets', 'Prévoir des gilets.'
    )$$,
  'second fixture need exists for mismatch checks'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"helper-1"}', true);
select throws_ok(
  $$insert into public.action_need_offers (need_id, offered_by_clerk_id, message)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-1', 'direct')$$,
  '42501', null,
  'authenticated cannot insert an offer directly'
);
select throws_ok(
  $$select count(*) from public.action_need_offers$$,
  '42501', null,
  'authenticated cannot read all offers directly'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"offer-manager"}', true);
select throws_ok(
  $$select public.transition_action_need_offer(
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
      'offer-manager', 'accept'
    )$$,
  'P0002', null,
  'a mismatched need rejects acceptance before mutation'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
  'pending',
  'mismatched acceptance leaves the offer pending'
);
select is(
  (select count(*)::integer from public.app_notifications
   where user_id = 'helper-1'
     and type = 'community'
     and payload ->> 'kind' = 'action_need_offer_accepted'),
  0,
  'mismatched acceptance creates no notification'
);
select lives_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
      'offer-manager', 'accept'
    )$$,
  'canonical manager accepts a pending offer'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
  'accepted',
  'acceptance persists the accepted status'
);
select is(
  (select count(*)::integer from public.app_notifications
   where user_id = 'helper-1'
     and type = 'community'
     and payload ->> 'kind' = 'action_need_offer_accepted'
     and payload ->> 'offerId' = (select id::text from public.action_need_offers where offered_by_clerk_id = 'helper-1')),
  1,
  'acceptance creates exactly one community notification'
);
select lives_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-1'),
      'offer-manager', 'accept'
    )$$,
  'repeated acceptance is idempotent'
);
select is(
  (select count(*)::integer from public.app_notifications
   where user_id = 'helper-1' and type = 'community' and payload ->> 'kind' = 'action_need_offer_accepted'),
  1,
  'repeated acceptance does not duplicate notification'
);
select is(
  (select count(*)::integer from public.action_registrations
   where action_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id = 'helper-1'),
  0,
  'acceptance does not create an action registration'
);
select is(
  (select count(*)::integer from public.action_participants
   where action_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id = 'helper-1'),
  0,
  'acceptance does not create a confirmed participation'
);

select lives_ok(
  $$select public.create_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-2', 'Je peux relayer.'
    )$$,
  'a second member can propose help'
);
select throws_ok(
  $$select public.transition_action_need_offer(
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-2'),
      'offer-manager', 'decline'
    )$$,
  'P0002', null,
  'a mismatched need rejects decline before mutation'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-2'),
  'pending',
  'mismatched decline leaves the offer pending'
);
select lives_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-2'),
      'offer-manager', 'decline'
    )$$,
  'canonical manager declines a pending offer'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-2'),
  'declined',
  'decline persists the declined status'
);
select lives_ok(
  $$select public.create_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-3', 'Je peux venir.'
    )$$,
  'a third member can propose help'
);
select throws_ok(
  $$select public.transition_action_need_offer(
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-3'),
      'helper-3', 'withdraw'
    )$$,
  'P0002', null,
  'a mismatched need rejects withdrawal before mutation'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-3'),
  'pending',
  'mismatched withdrawal leaves the offer pending'
);
select lives_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-3'),
      'helper-3', 'withdraw'
    )$$,
  'the offer author can withdraw a pending offer'
);
select lives_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-3'),
      'helper-3', 'withdraw'
    )$$,
  'repeated withdrawal is idempotent'
);
select is(
  (select status from public.action_need_offers where offered_by_clerk_id = 'helper-3'),
  'withdrawn',
  'withdrawal persists the withdrawn status'
);

select lives_ok(
  $$select public.create_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-4', 'Je peux aider.'
    )$$,
  'a fourth member can propose help before closure'
);
update public.action_needs
   set status = 'cancelled'
 where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select throws_ok(
  $$select public.transition_action_need_offer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select id from public.action_need_offers where offered_by_clerk_id = 'helper-4'),
      'offer-manager', 'accept'
    )$$,
  '40001', null,
  'acceptance is rejected when the need closes during the workflow'
);
select throws_ok(
  $$insert into public.action_need_offers (need_id, offered_by_clerk_id, status)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-invalid', 'accepted')$$,
  '23514', null,
  'direct terminal insertion is rejected'
);
select throws_ok(
  $$insert into public.action_need_offers (need_id, offered_by_clerk_id, message)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper-long', repeat('x', 301))$$,
  '23514', null,
  'messages over 300 characters are rejected'
);

select * from finish();
rollback;
