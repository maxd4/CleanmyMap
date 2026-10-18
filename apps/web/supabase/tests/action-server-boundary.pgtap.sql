begin;

select plan(14);

select ok(
  not has_table_privilege('anon', 'public.actions', 'INSERT'),
  'anon cannot insert actions through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.actions', 'INSERT'),
  'authenticated cannot insert actions through the Data API'
);
select ok(
  not has_table_privilege('anon', 'public.actions', 'UPDATE'),
  'anon cannot update action metrics through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.actions', 'UPDATE'),
  'authenticated cannot update action metrics through the Data API'
);
select ok(
  not has_table_privilege('anon', 'public.actions', 'DELETE'),
  'anon cannot delete actions through the Data API'
);
select ok(
  not has_table_privilege('authenticated', 'public.actions', 'DELETE'),
  'authenticated cannot delete actions through the Data API'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)',
    'EXECUTE'
  ),
  'authenticated cannot execute the server creation RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)',
    'EXECUTE'
  ),
  'service_role retains the server creation RPC'
);

create temp table action_server_boundary_fixture (
  private_action_id uuid not null,
  public_action_id uuid not null
);
grant select on action_server_boundary_fixture to anon, authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);

with private_action as (
  insert into public.actions (
    created_by_clerk_id,
    action_date,
    location_label,
    status,
    action_phase,
    preparation_data,
    moderation_visibility,
    published_at
  ) values (
    'creator-a',
    current_date,
    'Private action fixture',
    'pending',
    'pre_action',
    '{}'::jsonb,
    'visible',
    null
  ) returning id
), public_action as (
  insert into public.actions (
    created_by_clerk_id,
    action_date,
    location_label,
    status,
    action_phase,
    preparation_data,
    moderation_visibility
  ) values (
    'creator-a',
    current_date,
    'Public action fixture',
    'approved',
    'post_action_complete',
    '{}'::jsonb,
    'visible'
  ) returning id
)
insert into action_server_boundary_fixture (private_action_id, public_action_id)
select private_action.id, public_action.id
from private_action cross join public_action;

insert into public.action_organizers (
  action_id,
  organizer_clerk_id,
  organizer_label,
  is_primary
)
select private_action_id, 'creator-a', 'Private organizer', true
from action_server_boundary_fixture
union all
select public_action_id, 'creator-a', 'Public organizer', true
from action_server_boundary_fixture;

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"creator-b"}', true);

select throws_ok(
  $$insert into public.actions (created_by_clerk_id, action_date, location_label, status)
    values ('creator-b', current_date, 'forged creator', 'approved')$$,
  '42501',
  null,
  'authenticated cannot forge creator or approved status with a direct insert'
);
select throws_ok(
  $$update public.actions
       set waste_kg = 999, cigarette_butts = 999, volunteers_count = 999
     where id = (select public_action_id from action_server_boundary_fixture)$$,
  '42501',
  null,
  'authenticated cannot modify action metrics with a direct update'
);
select throws_ok(
  $$delete from public.actions
     where id = (select public_action_id from action_server_boundary_fixture)$$,
  '42501',
  null,
  'authenticated cannot delete an action directly'
);
select is(
  (select count(*)::integer from public.action_organizers ao
   where ao.action_id = (select private_action_id from action_server_boundary_fixture)),
  0,
  'a non-owner cannot read organizers of a private action'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(
  (select count(*)::integer from public.action_organizers ao
   where ao.action_id = (select private_action_id from action_server_boundary_fixture)),
  0,
  'anon cannot read organizers of a private action'
);
select is(
  (select count(*)::integer from public.action_organizers ao
   where ao.action_id = (select public_action_id from action_server_boundary_fixture)),
  1,
  'anon can read organizers of a public action'
);

select * from finish();
rollback;
