begin;

select plan(61);

select ok(not has_table_privilege('anon', 'public.event_rsvps', 'SELECT'), 'anon cannot read RSVP rows');
select ok(not has_table_privilege('anon', 'public.event_rsvps', 'INSERT'), 'anon cannot insert RSVP rows');
select ok(not has_table_privilege('anon', 'public.event_rsvps', 'UPDATE'), 'anon cannot update RSVP rows');
select ok(not has_table_privilege('anon', 'public.event_rsvps', 'DELETE'), 'anon cannot delete RSVP rows');
select ok(has_table_privilege('authenticated', 'public.event_rsvps', 'SELECT'), 'authenticated can read owned RSVP rows');
select ok(has_table_privilege('authenticated', 'public.event_rsvps', 'INSERT'), 'authenticated can insert owned RSVP rows');
select ok(not has_table_privilege('authenticated', 'public.event_rsvps', 'TRUNCATE'), 'authenticated cannot truncate RSVP rows');
select ok(not has_table_privilege('authenticated', 'public.event_rsvps', 'TRIGGER'), 'authenticated cannot create RSVP triggers');
select ok(not has_table_privilege('authenticated', 'public.event_rsvps', 'REFERENCES'), 'authenticated cannot add RSVP references');

select ok(not has_table_privilege('anon', 'public.quiz_srs', 'SELECT'), 'anon cannot read SRS rows');
select ok(not has_table_privilege('anon', 'public.quiz_srs', 'INSERT'), 'anon cannot insert SRS rows');
select ok(not has_table_privilege('anon', 'public.quiz_srs', 'UPDATE'), 'anon cannot update SRS rows');
select ok(not has_table_privilege('anon', 'public.quiz_srs', 'DELETE'), 'anon cannot delete SRS rows');
select ok(has_table_privilege('authenticated', 'public.quiz_srs', 'SELECT'), 'authenticated can read owned SRS rows');
select ok(has_table_privilege('authenticated', 'public.quiz_srs', 'INSERT'), 'authenticated can persist owned SRS rows');
select ok(not has_table_privilege('authenticated', 'public.quiz_srs', 'TRUNCATE'), 'authenticated cannot truncate SRS rows');
select ok(not has_table_privilege('authenticated', 'public.quiz_srs', 'TRIGGER'), 'authenticated cannot create SRS triggers');
select ok(not has_table_privilege('authenticated', 'public.quiz_srs', 'REFERENCES'), 'authenticated cannot add SRS references');

select ok(not has_table_privilege('anon', 'public.quiz_type_progress', 'SELECT'), 'anon cannot read quiz progress');
select ok(not has_table_privilege('authenticated', 'public.quiz_type_progress', 'INSERT'), 'authenticated cannot insert reliable progress');
select ok(not has_table_privilege('authenticated', 'public.quiz_type_progress', 'UPDATE'), 'authenticated cannot update reliable progress');
select ok(not has_table_privilege('authenticated', 'public.quiz_type_progress', 'DELETE'), 'authenticated cannot delete reliable progress');
select ok(has_table_privilege('authenticated', 'public.quiz_type_progress', 'SELECT'), 'authenticated can read own progress');

select ok(not has_table_privilege('anon', 'public.app_notifications', 'SELECT'), 'anon cannot read notifications');
select ok(has_table_privilege('authenticated', 'public.app_notifications', 'SELECT'), 'authenticated can read own notifications');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'read_at', 'UPDATE'), 'authenticated can mark notifications read');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'seen_at', 'UPDATE'), 'authenticated can mark notifications seen');
select ok(has_column_privilege('authenticated', 'public.app_notifications', 'acknowledged_at', 'UPDATE'), 'authenticated can acknowledge notifications');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'title', 'UPDATE'), 'authenticated cannot rewrite notification titles');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'type', 'UPDATE'), 'authenticated cannot rewrite notification types');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'payload', 'UPDATE'), 'authenticated cannot rewrite notification payloads');
select ok(not has_column_privilege('authenticated', 'public.app_notifications', 'user_id', 'UPDATE'), 'authenticated cannot rewrite notification owners');

select ok(has_table_privilege('service_role', 'public.event_rsvps', 'INSERT'), 'service_role retains RSVP writes');
select ok(has_table_privilege('service_role', 'public.quiz_srs', 'INSERT'), 'service_role retains SRS writes');
select ok(has_table_privilege('service_role', 'public.quiz_type_progress', 'UPDATE'), 'service_role retains reliable progress writes');
select ok(has_table_privilege('service_role', 'public.app_notifications', 'INSERT'), 'service_role retains notification production');

create temp table user_data_boundary_fixture (
  event_id uuid not null,
  notification_id uuid not null
);
grant select on user_data_boundary_fixture to anon, authenticated;
grant select, insert on user_data_boundary_fixture to service_role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);

with inserted_event as (
  insert into public.community_events (
    organizer_clerk_id,
    title,
    event_date,
    location_label,
    description
  ) values (
    'organizer-a',
    'User data boundary fixture',
    current_date,
    'Fixture location',
    'Fixture description'
  )
  returning id
)
insert into user_data_boundary_fixture (event_id, notification_id)
select id, '00000000-0000-4000-8000-000000000001'::uuid
from inserted_event;

insert into public.event_rsvps (event_id, participant_clerk_id, status)
select event_id, participant_clerk_id, status
from user_data_boundary_fixture
cross join (values ('user-a', 'yes'), ('user-b', 'maybe')) as fixture(participant_clerk_id, status);

insert into public.quiz_srs (
  user_id, question_id, next_review_at, success_count, failure_count, streak, ease_factor, mastery_level
) values
  ('user-a', 'boundary-question-a', now(), 1, 0, 1, 2.5, 1),
  ('user-b', 'boundary-question-b', now(), 2, 0, 2, 2.5, 2);

insert into public.quiz_type_progress (user_id, question_type, correct_count)
values ('user-a', 'true-false', 3), ('user-b', 'true-false', 7);

insert into public.app_notifications (id, user_id, type, title, content, payload)
values
  ((select notification_id from user_data_boundary_fixture), 'user-a', 'system', 'A title', 'A message', '{"owner":"user-a"}'::jsonb),
  (gen_random_uuid(), 'user-b', 'system', 'B title', 'B message', '{"owner":"user-b"}'::jsonb);

reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select count(*) from public.event_rsvps$$, '42501', null, 'anon cannot select private RSVP data');
select throws_ok($$select count(*) from public.quiz_srs$$, '42501', null, 'anon cannot select private SRS data');
select throws_ok($$select count(*) from public.app_notifications$$, '42501', null, 'anon cannot select private notifications');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"user-a"}', true);
select is((select count(*)::integer from public.event_rsvps where participant_clerk_id = 'user-a'), 1, 'A can read own RSVP');
select is((select count(*)::integer from public.event_rsvps where participant_clerk_id = 'user-b'), 0, 'A cannot read B RSVP');
select is((select count(*)::integer from public.quiz_srs where user_id = 'user-a'), 1, 'A can read own SRS');
select is((select count(*)::integer from public.quiz_srs where user_id = 'user-b'), 0, 'A cannot read B SRS');
select is((select count(*)::integer from public.app_notifications where user_id = 'user-a'), 1, 'A can read own notification');
select is((select count(*)::integer from public.app_notifications where user_id = 'user-b'), 0, 'A cannot read B notification');
select lives_ok($$update public.event_rsvps set status = 'no' where participant_clerk_id = 'user-b'$$, 'A cannot modify B RSVP');
select lives_ok($$update public.quiz_srs set success_count = 99 where user_id = 'user-b'$$, 'A cannot modify B SRS');
select lives_ok($$update public.app_notifications set read_at = now() where user_id = 'user-b'$$, 'A cannot modify B notification');
select lives_ok($$insert into public.quiz_srs (user_id, question_id, next_review_at, success_count, failure_count, streak, ease_factor, mastery_level)
  values ('user-a', 'boundary-question-new', now(), 1, 0, 1, 2.5, 1)$$, 'A can persist own SRS state');
select lives_ok($$update public.app_notifications set read_at = now(), seen_at = now(), acknowledged_at = now()
  where user_id = 'user-a'$$, 'A can update notification read state');
select throws_ok($$update public.app_notifications set title = 'forged' where user_id = 'user-a'$$, '42501', null, 'A cannot update notification title');
select throws_ok($$update public.app_notifications set payload = '{"forged":true}'::jsonb where user_id = 'user-a'$$, '42501', null, 'A cannot update notification payload');
select throws_ok($$update public.app_notifications set user_id = 'user-b' where user_id = 'user-a'$$, '42501', null, 'A cannot transfer notification ownership');
select throws_ok($$update public.quiz_type_progress set correct_count = 999 where user_id = 'user-a'$$, '42501', null, 'A cannot update reliable quiz counters');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":""}', true);
select is((select count(*)::integer from public.event_rsvps), 0, 'an authenticated session with empty sub sees no RSVPs');
select is((select count(*)::integer from public.quiz_srs), 0, 'an authenticated session with empty sub sees no SRS');
select is((select count(*)::integer from public.app_notifications), 0, 'an authenticated session with empty sub sees no notifications');
select throws_ok($$insert into public.quiz_srs (user_id, question_id, next_review_at, success_count, failure_count, streak, ease_factor, mastery_level)
  values ('', 'boundary-empty-owner', now(), 1, 0, 1, 2.5, 1)$$, '42501', null, 'an empty sub cannot create an empty-owner SRS row');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select is((select status from public.event_rsvps where participant_clerk_id = 'user-a'), 'yes', 'B RSVP update did not alter A-owned RSVP');
select is((select success_count from public.quiz_srs where user_id = 'user-b'), 2, 'A SRS update did not alter B-owned SRS');
select is((select title from public.app_notifications where user_id = 'user-a'), 'A title', 'notification title remains server-owned');

select * from finish();
rollback;
