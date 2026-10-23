begin;

select plan(18);

select ok(
  not has_table_privilege('anon', 'public.community_events', 'INSERT'),
  'anon cannot insert community events through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_events', 'INSERT'),
  'authenticated cannot insert community events through the Data API'
);
select ok(
  not has_table_privilege('anon', 'public.community_events', 'UPDATE'),
  'anon cannot update community events through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_events', 'UPDATE'),
  'authenticated cannot update community events through the Data API'
);
select ok(
  not has_table_privilege('anon', 'public.community_events', 'DELETE'),
  'anon cannot delete community events through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_events', 'DELETE'),
  'authenticated cannot delete community events through the Data API'
);
select ok(
  has_table_privilege('service_role', 'public.community_events', 'INSERT'),
  'service_role retains event creation'
);
select ok(
  has_table_privilege('service_role', 'public.community_events', 'UPDATE'),
  'service_role retains event operations'
);
select ok(
  has_table_privilege('service_role', 'public.community_events', 'DELETE'),
  'service_role retains server deletion capability'
);
select ok(
  not has_table_privilege('anon', 'public.community_events', 'SELECT'),
  'anon cannot read community_events directly through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.community_events', 'SELECT'),
  'authenticated cannot read community_events directly through the Data API'
);
select ok(
  has_table_privilege('service_role', 'public.community_events', 'SELECT'),
  'service_role retains server-side event reads'
);

create temp table community_event_server_boundary_fixture (
  event_id uuid not null
);
grant select on community_event_server_boundary_fixture to anon, authenticated;
grant select, insert on community_event_server_boundary_fixture to service_role;

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
    'Public event fixture',
    current_date,
    'Fixture location',
    'Fixture description'
  )
  returning id
)
insert into community_event_server_boundary_fixture (event_id)
select id
from inserted_event;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select is(
  (select organizer_clerk_id
   from public.community_events
   where id = (select event_id from community_event_server_boundary_fixture)),
  'organizer-a',
  'service_role can read internal event columns server-side'
);

reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select organizer_clerk_id
      from public.community_events
      where id = (select event_id from community_event_server_boundary_fixture)$$,
  '42501',
  null,
  'anon cannot read internal event columns directly'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"organizer-b"}', true);
select throws_ok(
  $$select organizer_clerk_id
      from public.community_events
      where id = (select event_id from community_event_server_boundary_fixture)$$,
  '42501',
  null,
  'authenticated users cannot read internal event columns directly'
);
select throws_ok(
  $$insert into public.community_events (
       organizer_clerk_id, title, event_date, location_label
     ) values (
       'organizer-b', current_date, 'Forged organizer event', 'Data API'
     )$$,
  '42501',
  null,
  'authenticated cannot forge an organizer with a direct insert'
);
select throws_ok(
  $$update public.community_events
       set description = 'Forged operational update'
     where id = (select event_id from community_event_server_boundary_fixture)$$,
  '42501',
  null,
  'authenticated cannot modify another organizer event directly'
);
select throws_ok(
  $$delete from public.community_events
     where id = (select event_id from community_event_server_boundary_fixture)$$,
  '42501',
  null,
  'authenticated cannot delete a community event directly'
);

select * from finish();
rollback;
