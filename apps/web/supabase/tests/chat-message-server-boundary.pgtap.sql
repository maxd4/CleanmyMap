begin;

select plan(22);

select ok(
  not has_table_privilege('anon', 'public.app_messages', 'INSERT'),
  'anon cannot create messages through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.app_messages', 'INSERT'),
  'authenticated cannot create messages through the Data API'
);
select ok(
  has_table_privilege('authenticated', 'public.app_messages', 'SELECT'),
  'authenticated retains message reads'
);
select ok(
  has_table_privilege('service_role', 'public.app_messages', 'INSERT'),
  'service_role retains the server message write capability'
);

select ok(
  not has_table_privilege('anon', 'public.chat_poll_options', 'INSERT'),
  'anon cannot create poll options directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.chat_poll_options', 'INSERT'),
  'authenticated cannot create poll options directly'
);
select ok(
  has_table_privilege('service_role', 'public.chat_poll_options', 'INSERT'),
  'service_role retains atomic poll option persistence'
);
select ok(
  has_table_privilege('authenticated', 'public.chat_poll_options', 'SELECT'),
  'authenticated retains visible poll option reads'
);

select ok(
  has_table_privilege('authenticated', 'public.chat_poll_votes', 'INSERT'),
  'authenticated retains direct poll voting'
);
select ok(
  has_table_privilege('authenticated', 'public.chat_poll_votes', 'UPDATE'),
  'authenticated retains poll vote replacement'
);
select ok(
  has_table_privilege('authenticated', 'public.chat_poll_votes', 'DELETE'),
  'authenticated retains poll vote removal'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_chat_poll_with_options(text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'anon cannot execute the legacy poll creation RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_chat_poll_with_options(text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute the legacy poll creation RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.create_chat_poll_with_options(text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'the legacy poll creation RPC is closed even to service callers'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_chat_poll_with_options_for_server(text, text, text, jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute the legacy server poll RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.create_chat_poll_with_options_for_server(text, text, text, jsonb)',
    'EXECUTE'
  ),
  'the legacy server poll RPC is closed'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_chat_poll_with_options_for_server(text, text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'anon cannot execute the server poll RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_chat_poll_with_options_for_server(text, text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute the server poll RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_chat_poll_with_options_for_server(text, text, text, text, jsonb, text, uuid, integer, text)',
    'EXECUTE'
  ),
  'service_role retains only the explicit server poll RPC'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"chat-user"}', true);
select throws_ok(
  $$insert into public.app_messages (sender_id, channel_type, content)
    values ('chat-user', 'community', 'direct write')$$,
  '42501',
  null,
  'an authenticated Data API session cannot insert a message'
);
select throws_ok(
  $$select public.create_chat_poll_with_options(
    'community', 'quota bypass', null, '["Oui", "Non"]'::jsonb,
    null, null, null, null
  )$$,
  '42501',
  null,
  'an authenticated Data API session cannot call the legacy poll RPC'
);
select throws_ok(
  $$select public.create_chat_poll_with_options_for_server(
    'chat-user', 'community', 'quota bypass', null,
    '["Oui", "Non"]'::jsonb, null, null, null, null
  )$$,
  '42501',
  null,
  'an authenticated Data API session cannot call the server poll RPC'
);

select * from finish();
rollback;
