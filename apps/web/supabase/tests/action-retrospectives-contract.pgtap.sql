begin;

select plan(27);

select has_table('public', 'action_retrospectives', 'retrospective table exists');
select has_index('public', 'action_retrospectives_pkey', 'one retrospective exists per action');
select ok((select relrowsecurity from pg_class where oid = 'public.action_retrospectives'::regclass), 'retrospectives have RLS enabled');
select ok(not has_table_privilege('authenticated', 'public.action_retrospectives', 'SELECT'), 'authenticated cannot read private retrospectives directly');
select ok(not has_table_privilege('authenticated', 'public.action_retrospectives', 'INSERT'), 'authenticated cannot insert private retrospectives directly');
select ok(not has_table_privilege('authenticated', 'public.action_retrospectives', 'UPDATE'), 'authenticated cannot update private retrospectives directly');
select ok(has_table_privilege('service_role', 'public.action_retrospectives', 'SELECT'), 'service_role can read retrospectives');
select ok(has_table_privilege('service_role', 'public.action_retrospectives', 'INSERT'), 'service_role can insert retrospectives');
select ok(has_table_privilege('service_role', 'public.action_retrospectives', 'UPDATE'), 'service_role can update retrospectives');
select ok(has_function_privilege('service_role', 'public.save_action_retrospective(uuid, text, text, text, text, text)', 'EXECUTE'), 'service_role can execute draft save');
select ok(not has_function_privilege('authenticated', 'public.save_action_retrospective(uuid, text, text, text, text, text)', 'EXECUTE'), 'authenticated cannot execute draft save');
select ok(has_function_privilege('service_role', 'public.publish_action_retrospective(uuid, text)', 'EXECUTE'), 'service_role can execute publication');
select ok(not has_function_privilege('authenticated', 'public.publish_action_retrospective(uuid, text)', 'EXECUTE'), 'authenticated cannot execute publication');

create temp table action_retrospective_fixture (action_id uuid not null);
grant select on action_retrospective_fixture to anon, authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"retro-service"}', true);

select lives_ok($fixture$
  do $$
  declare
    v_action_id uuid := gen_random_uuid();
  begin
    insert into public.actions (
      id, created_by_clerk_id, action_date, location_label, status,
      action_phase, published_at, moderation_visibility, access_mode, review_state
    ) values (
      v_action_id, 'retro-creator', current_date - 1, 'Retro contract fixture',
      'approved', 'post_action_complete', timezone('utc', now()), 'visible', 'public', 'not_required'
    );
    insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label)
    values (v_action_id, 'retro-organizer', 'Retro organizer');
    insert into public.action_participants (action_id, user_id, participation_status)
    values
      (v_action_id, 'retro-participant', 'confirmed'),
      (v_action_id, 'retro-future', 'pending');
    insert into action_retrospective_fixture values (v_action_id);
  end;
  $$;
$fixture$, 'fixture action, organizer and final participation rows can be created');

select lives_ok(
  $$select * from public.save_action_retrospective(
    (select action_id from action_retrospective_fixture),
    'retro-organizer',
    '  Merci   au groupe  ',
    '  Bonne coordination  ',
    null,
    null
  )$$,
  'an organizer can save a normalized draft'
);
select is(
  (select thanks_message from public.action_retrospectives where action_id = (select action_id from action_retrospective_fixture)),
  'Merci au groupe',
  'draft text is normalized server-side'
);
select is(
  (select published_at from public.action_retrospectives where action_id = (select action_id from action_retrospective_fixture)),
  null::timestamptz,
  'draft remains unpublished'
);
select is(
  (select count(*)::integer from public.read_public_action_retrospective((select action_id from action_retrospective_fixture))),
  0,
  'draft is absent from the public projection'
);

select lives_ok(
  $$select * from public.publish_action_retrospective(
    (select action_id from action_retrospective_fixture), 'retro-organizer'
  )$$,
  'first publication succeeds through the atomic RPC'
);
select ok(
  (select published_at is not null from public.action_retrospectives where action_id = (select action_id from action_retrospective_fixture)),
  'publication receives its first timestamp'
);
select ok(
  (select notified_at is not null from public.action_retrospectives where action_id = (select action_id from action_retrospective_fixture)),
  'notification completion is recorded in the same transaction'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'retro-participant' and type = 'community' and payload ->> 'eventType' = 'action_retrospective_published'),
  1,
  'only the confirmed final participant is notified'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'retro-future' and payload ->> 'eventType' = 'action_retrospective_published'),
  0,
  'pending future participation is not notified'
);
select is(
  (select payload ->> 'actionId' from public.app_notifications where user_id = 'retro-participant' and payload ->> 'eventType' = 'action_retrospective_published'),
  (select action_id::text from action_retrospective_fixture),
  'notification carries the stable action identity'
);
select lives_ok(
  $$select * from public.publish_action_retrospective(
    (select action_id from action_retrospective_fixture), 'retro-organizer'
  )$$,
  'publication replay is idempotent'
);
select is(
  (select count(*)::integer from public.app_notifications where user_id = 'retro-participant' and payload ->> 'eventType' = 'action_retrospective_published'),
  1,
  'publication replay does not renotify'
);
select is(
  (select count(*)::integer from public.read_public_action_retrospective((select action_id from action_retrospective_fixture))),
  1,
  'published editorial fields are available in the public projection'
);

select * from finish();
rollback;
