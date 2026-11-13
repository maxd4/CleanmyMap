begin;

-- This fixture is executed by the isolated/staging Supabase SQL-proof runner.
-- It intentionally does not seed production data or apply migrations.
select plan(33);

reset role;
set local role anon;
select lives_ok(
  $$select 1 from public.actions_map_feed() limit 0$$,
  'anon can invoke the filtered map RPC'
);
reset role;
set local role authenticated;
select lives_ok(
  $$select 1 from public.actions_map_feed() limit 0$$,
  'authenticated can invoke the filtered map RPC'
);
reset role;
set local role service_role;

select has_function(
  'public', 'actions_map_feed',
  array['double precision','double precision','double precision','double precision','integer','text','date','text[]','text','integer'],
  'the public map RPC keeps its existing signature'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.actions_map_feed(double precision,double precision,double precision,double precision,integer,text,date,text[],text,integer)'::regprocedure),
  true,
  'the map RPC runs with its owner to read the service-only statistical view'
);
select is(
  (select has_table_privilege('anon', 'public.action_map_statistical_source', 'select')),
  false,
  'anon does not receive direct statistical-view SELECT'
);
select is(
  (select has_table_privilege('authenticated', 'public.action_map_statistical_source', 'select')),
  false,
  'authenticated does not receive direct statistical-view SELECT'
);
select ok(
  position('review_state' in coalesce((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'actions_select_public_or_owner'), '')) > 0,
  'public action RLS retains the review-state predicate'
);
select ok(
  position('access_mode' in coalesce((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'actions_select_public_or_owner'), '')) > 0,
  'public action RLS excludes invitation-link actions'
);
select is(
  has_function_privilege('authenticated', 'public.can_insert_action_message_reference(uuid)', 'execute'),
  false,
  'the exposed message-reference RPC remains closed to authenticated clients'
);
select is(
  has_function_privilege('service_role', 'public.can_insert_action_message_reference(uuid)', 'execute'),
  true,
  'the exposed message-reference RPC remains available to service_role'
);
select ok(
  position('cleanmymap.action_creation_provenance' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)) > 0,
  'creation wrapper sets the server provenance marker'
);
select ok(
  position('v_replayed' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)) > 0,
  'creation wrapper retains replay information'
);
select ok(
  position('is_action_discussion_available_utc' in pg_get_functiondef('private.can_view_action_conversation(uuid)'::regprocedure)) > 0,
  'conversation access uses persisted UTC'
);
select ok(
  position('event_start_at' in pg_get_functiondef('public.is_action_ride_eligible_member(uuid,text)'::regprocedure)) > 0,
  'ride member eligibility uses persisted UTC'
);
select ok(
  position('p_departure_at < a.event_start_at' in pg_get_functiondef('public.is_action_ride_departure_eligible(uuid,timestamptz)'::regprocedure)) > 0,
  'ride departure compares UTC instants'
);
select ok(
  position('review_state' in pg_get_functiondef('public.can_insert_action_message_reference(uuid)'::regprocedure)) > 0,
  'message references retain review-state gating'
);
select ok(
  position('is_public_future_pre_action_v2' in pg_get_functiondef('private.can_insert_action_message_reference(uuid)'::regprocedure)) > 0,
  'the private message-reference policy helper uses persisted UTC'
);
select is(
  position('is_public_future_pre_action(' in pg_get_functiondef('private.can_insert_action_message_reference(uuid)'::regprocedure)),
  0,
  'the private message-reference policy helper no longer calls the Paris predicate'
);
select ok(
  position('is_public_future_pre_action_v2' in pg_get_functiondef('public.is_public_open_action_need(uuid)'::regprocedure)) > 0,
  'open action needs use persisted UTC'
);
select ok(
  position('is_public_future_pre_action_v2' in pg_get_functiondef('public.accept_action_buddy_proposal(uuid)'::regprocedure)) > 0,
  'buddy acceptance uses persisted UTC'
);
select ok(
  position('(p_departure_at at time zone a.action_timezone)::date' in pg_get_functiondef('public.is_action_ride_departure_eligible(uuid,timestamptz)'::regprocedure)) > 0,
  'ride departures use the action local civil date'
);
select ok(
  position('is_public_future_pre_action_v2' in pg_get_functiondef('public.accept_action_ride_request(uuid,text)'::regprocedure)) > 0,
  'ride acceptance uses persisted UTC'
);
select ok(
  position('is_public_future_pre_action_v2' in pg_get_functiondef('public.update_action_ride_details(uuid,text,text,timestamptz,smallint,text)'::regprocedure)) > 0,
  'ride updates use persisted UTC'
);
select ok(
  position('action_timezone' in pg_get_functiondef('public.emit_action_j1_reminders(timestamptz)'::regprocedure)) > 0,
  'reminders remain per-action timezone aware'
);
select ok(
  position('at time zone ''Europe/Paris''' in pg_get_functiondef('public.is_action_ride_departure_eligible(uuid,timestamptz)'::regprocedure)) = 0,
  'ride departure no longer reconstructs Paris civil time'
);
select ok(
  position('security_invoker' in lower(pg_get_functiondef('public.actions_map_feed(double precision,double precision,double precision,double precision,integer,text,date,text[],text,integer)'::regprocedure))) = 0,
  'map function is not left as invoker'
);
select ok(
  position('coalesce(v_replayed, false)' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)) > 0,
  'replay branch is explicit'
);
select ok(
  position('event_start_at' in pg_get_functiondef('public.is_action_discussion_available_utc(text,timestamptz,text,text,text,timestamptz)'::regprocedure)) > 0,
  'discussion contract accepts the canonical event instant'
);
select is(
  public.is_public_future_pre_action_v2('pre_action', timezone('utc', now()), 'visible', 'pending',
    (timestamp '2099-03-29 09:00' at time zone 'Europe/Paris')),
  true,
  'Paris future action uses its persisted instant'
);
select is(
  public.is_public_future_pre_action_v2('pre_action', timezone('utc', now()), 'visible', 'pending',
    (timestamp '2099-03-09 09:00' at time zone 'America/Montreal')),
  true,
  'Montreal future action uses its persisted instant'
);
select is(
  public.is_public_future_pre_action_v2('pre_action', timezone('utc', now()), 'visible', 'pending',
    (timestamp '2099-01-15 09:00' at time zone 'Africa/Dakar')),
  true,
  'Dakar future action uses its persisted instant'
);
select is(
  public.is_public_future_pre_action_v2('pre_action', timezone('utc', now()), 'visible', 'pending',
    (timestamp '2099-04-05 09:00' at time zone 'Pacific/Noumea')),
  true,
  'Noumea future action uses its persisted instant'
);
select is(
  public.is_public_future_pre_action_v2('pre_action', timezone('utc', now()), 'visible', 'pending',
    (timestamp '2099-04-05 09:00' at time zone 'Pacific/Tahiti')),
  true,
  'Papeete future action uses its persisted instant'
);

select * from finish();
rollback;
