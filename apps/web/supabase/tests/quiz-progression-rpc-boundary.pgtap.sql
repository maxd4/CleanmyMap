begin;

select plan(39);

select ok(has_function_privilege('service_role', 'public.record_quiz_progression(text, text, text[], jsonb)', 'EXECUTE'), 'service_role can execute quiz progression RPC');
select ok(not has_function_privilege('authenticated', 'public.record_quiz_progression(text, text, text[], jsonb)', 'EXECUTE'), 'authenticated cannot execute quiz progression RPC');
select ok(not has_function_privilege('anon', 'public.record_quiz_progression(text, text, text[], jsonb)', 'EXECUTE'), 'anon cannot execute quiz progression RPC');
select ok((select prosecdef from pg_proc where oid = 'public.record_quiz_progression(text, text, text[], jsonb)'::regprocedure), 'quiz progression RPC is security definer');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

delete from public.progression_events
 where user_id in ('quiz-rpc-zero', 'quiz-rpc-49', 'quiz-rpc-99', 'quiz-rpc-balanced', 'quiz-rpc-invalid', 'quiz-rpc-rollback');
delete from public.quiz_type_progress
 where user_id in ('quiz-rpc-zero', 'quiz-rpc-49', 'quiz-rpc-99', 'quiz-rpc-balanced', 'quiz-rpc-invalid', 'quiz-rpc-rollback');

-- A first answer advances the counter, but a future threshold does not create an event.
select is((public.record_quiz_progression(
  'quiz-rpc-zero', 'quiz-a', array['quiz-a', 'quiz-b'],
  '[{"metric":"type","threshold":50,"user_id":"quiz-rpc-zero","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"quiz-rpc-zero-50","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{"case":"zero-to-one"}}]'::jsonb
) ->> 'previous_count')::integer, 0, 'the first answer starts at zero');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-zero' and question_type = 'quiz-a'), 1, 'the first answer advances the counter to one');
select is((public.record_quiz_progression(
  'quiz-rpc-zero', 'quiz-a', array['quiz-a', 'quiz-b'], '[]'::jsonb
) ->> 'correct_count')::integer, 2, 'the second answer advances the counter to two');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-zero' and question_type = 'quiz-a'), 2, 'the counter is persisted');
select is(jsonb_array_length(public.record_quiz_progression(
  'quiz-rpc-zero', 'quiz-a', array['quiz-a', 'quiz-b'],
  '[{"metric":"type","threshold":50,"user_id":"quiz-rpc-zero","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"quiz-rpc-zero-50","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}}]'::jsonb
) -> 'inserted_events'), 0, 'no milestone is inserted before its threshold');
select is((select count(*)::integer from public.progression_events where user_id = 'quiz-rpc-zero'), 0, 'no-threshold progress creates no event');

insert into public.quiz_type_progress (user_id, question_type, correct_count)
values ('quiz-rpc-49', 'quiz-a', 49), ('quiz-rpc-99', 'quiz-a', 99),
       ('quiz-rpc-balanced', 'quiz-a', 9), ('quiz-rpc-balanced', 'quiz-b', 9),
       ('quiz-rpc-invalid', 'quiz-a', 0), ('quiz-rpc-rollback', 'quiz-a', 0);

select is((public.record_quiz_progression(
  'quiz-rpc-49', 'quiz-a', array['quiz-a'],
  '[{"metric":"type","threshold":50,"user_id":"quiz-rpc-49","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"quiz-rpc-49-50","status_phase":"validated","weight":1,"xp_base":3,"xp_awarded":3,"occurred_on":"2026-10-28","metadata":{"case":"49-to-50","badge":"quiz-type-50"}}]'::jsonb
) ->> 'previous_count')::integer, 49, 'the 49th answer observes the previous count');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-49' and question_type = 'quiz-a'), 50, 'the 49th answer crosses 50');
select is(jsonb_array_length(public.record_quiz_progression(
  'quiz-rpc-49', 'quiz-a', array['quiz-a'], '[]'::jsonb
) -> 'inserted_events'), 0, 'a replay does not report a duplicate event');
select is((select count(*)::integer from public.progression_events where user_id = 'quiz-rpc-49' and source_id = 'quiz-rpc-49-50'), 1, 'the 50 milestone is persisted once');
select is((select xp_base from public.progression_events where user_id = 'quiz-rpc-49' and source_id = 'quiz-rpc-49-50'), 3, 'the 50 milestone keeps xp_base');
select is((select xp_awarded from public.progression_events where user_id = 'quiz-rpc-49' and source_id = 'quiz-rpc-49-50'), 3, 'the 50 milestone keeps xp_awarded');
select is((select metadata from public.progression_events where user_id = 'quiz-rpc-49' and source_id = 'quiz-rpc-49-50'), '{"badge":"quiz-type-50","case":"49-to-50"}'::jsonb, 'the 50 milestone keeps metadata');
select is((select occurred_on from public.progression_events where user_id = 'quiz-rpc-49' and source_id = 'quiz-rpc-49-50'), '2026-10-28'::date, 'the 50 milestone keeps occurred_on');

select is((public.record_quiz_progression(
  'quiz-rpc-99', 'quiz-a', array['quiz-a'],
  '[{"metric":"type","threshold":100,"user_id":"quiz-rpc-99","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"quiz-rpc-99-100","status_phase":"validated","weight":1,"xp_base":5,"xp_awarded":5,"occurred_on":"2026-10-28","metadata":{}}]'::jsonb
) ->> 'correct_count')::integer, 100, 'the 99th answer crosses 100');
select is((select count(*)::integer from public.progression_events where user_id = 'quiz-rpc-99' and source_id = 'quiz-rpc-99-100'), 1, 'the 100 milestone is persisted');

select is((public.record_quiz_progression(
  'quiz-rpc-balanced', 'quiz-a', array['quiz-a', 'quiz-b'],
  '[{"metric":"balance","threshold":10,"user_id":"quiz-rpc-balanced","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"quiz-rpc-balanced-10","status_phase":"validated","weight":1,"xp_base":2,"xp_awarded":2,"occurred_on":"2026-10-28","metadata":{"case":"balanced-9-to-10"}}]'::jsonb
) ->> 'previous_balanced_count')::integer, 9, 'balanced progression observes nine');
select is(jsonb_array_length(public.record_quiz_progression(
  'quiz-rpc-balanced', 'quiz-a', array['quiz-a', 'quiz-b'],
  '[{"metric":"balance","threshold":10,"user_id":"quiz-rpc-balanced","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"quiz-rpc-balanced-10","status_phase":"validated","weight":1,"xp_base":2,"xp_awarded":2,"occurred_on":"2026-10-28","metadata":{"case":"balanced-9-to-10"}}]'::jsonb
) -> 'inserted_events'), 0, 'the balanced milestone is not inserted while the minimum remains nine');
select is((public.record_quiz_progression(
  'quiz-rpc-balanced', 'quiz-b', array['quiz-a', 'quiz-b'],
  '[{"metric":"balance","threshold":10,"user_id":"quiz-rpc-balanced","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"quiz-rpc-balanced-10","status_phase":"validated","weight":1,"xp_base":2,"xp_awarded":2,"occurred_on":"2026-10-28","metadata":{"case":"balanced-9-to-10"}}]'::jsonb
) ->> 'previous_balanced_count')::integer, 9, 'the second balanced transition observes nine');
select is((public.record_quiz_progression(
  'quiz-rpc-balanced', 'quiz-b', array['quiz-a', 'quiz-b'],
  '[{"metric":"balance","threshold":10,"user_id":"quiz-rpc-balanced","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"quiz-rpc-balanced-10","status_phase":"validated","weight":1,"xp_base":2,"xp_awarded":2,"occurred_on":"2026-10-28","metadata":{"case":"balanced-9-to-10"}}]'::jsonb
) ->> 'balanced_count')::integer, 10, 'balanced progression reaches ten');
select is((select count(*)::integer from public.progression_events
  where user_id = 'quiz-rpc-balanced'
    and event_type = 'quiz_question_type_balance_milestone'
    and source_table = 'quiz_type_balance_progress'
    and source_id = 'quiz-rpc-balanced-10'
    and status_phase = 'validated'), 1, 'the balanced milestone is persisted once under its full identity');
select is((select xp_awarded from public.progression_events where user_id = 'quiz-rpc-balanced' and source_id = 'quiz-rpc-balanced-10'), 2, 'the balanced milestone keeps XP');
select is((select metadata from public.progression_events where user_id = 'quiz-rpc-balanced' and source_id = 'quiz-rpc-balanced-10'), '{"case":"balanced-9-to-10"}'::jsonb, 'the balanced milestone keeps metadata');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-balanced' and question_type = 'quiz-a'), 10, 'balanced first type is ten');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-balanced' and question_type = 'quiz-b'), 10, 'balanced second type is ten');
select is(jsonb_array_length(public.record_quiz_progression(
  'quiz-rpc-balanced', 'quiz-b', array['quiz-a', 'quiz-b'],
  '[{"metric":"balance","threshold":10,"user_id":"quiz-rpc-balanced","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"quiz-rpc-balanced-10","status_phase":"validated","weight":1,"xp_base":2,"xp_awarded":2,"occurred_on":"2026-10-28","metadata":{"case":"balanced-9-to-10"}}]'::jsonb
) -> 'inserted_events'), 0, 'replaying the balanced candidate does not create a second event');

select throws_ok($$select public.record_quiz_progression(
  'quiz-rpc-invalid', 'quiz-a', array['quiz-a'],
  '[{"metric":"type","threshold":50,"user_id":"quiz-rpc-invalid","source_table":"quiz_type_progress","source_id":"quiz-rpc-invalid-50","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}}]'::jsonb
)$$, null, null, 'a candidate missing event_type is rejected');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-invalid' and question_type = 'quiz-a'), 0, 'missing event_type rolls back the counter');

select throws_ok($$select public.record_quiz_progression(
  'quiz-rpc-invalid', 'quiz-a', array['quiz-a'],
  '[{"metric":"type","threshold":50,"user_id":"other-user","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"quiz-rpc-invalid-user","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}}]'::jsonb
)$$, null, null, 'an incoherent user identity is rejected');

select throws_ok($$select public.record_quiz_progression(
  'quiz-rpc-rollback', 'quiz-a', array['quiz-a'],
  '[{"metric":"type","threshold":1,"user_id":"quiz-rpc-rollback","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":null,"status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}}]'::jsonb
)$$, '23502', null, 'an insertion error aborts the transaction');
select is((select correct_count from public.quiz_type_progress where user_id = 'quiz-rpc-rollback' and question_type = 'quiz-a'), 0, 'an insertion error rolls back the counter');
select is((select count(*)::integer from public.progression_events where user_id = 'quiz-rpc-rollback'), 0, 'an insertion error leaves no event');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"quiz-rpc-auth"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$select public.record_quiz_progression('quiz-rpc-auth', 'quiz-a', array['quiz-a'], '[]'::jsonb)$$, '42501', null, 'authenticated is rejected by the RPC');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok($$select public.record_quiz_progression('quiz-rpc-anon', 'quiz-a', array['quiz-a'], '[]'::jsonb)$$, '42501', null, 'anon is rejected by the RPC');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok($$select public.record_quiz_progression('quiz-rpc-service', 'quiz-a', array['quiz-a'], '[]'::jsonb)$$, 'service_role can call the RPC');

select * from finish();
rollback;
