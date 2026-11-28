begin;

select plan(7);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"partial-composition-test"}', true);

insert into public.actions (
  created_by_clerk_id, action_date, location_label, status, volunteers_count,
  children_count, adult_count, retired_count
)
values
  ('partial-composition-test', current_date, 'Partial children only', 'approved', 10, 0, null, null),
  ('partial-composition-test', current_date, 'Partial adults only', 'approved', 10, null, 0, null),
  ('partial-composition-test', current_date, 'Partial retirees only', 'approved', 10, null, null, 0),
  ('partial-composition-test', current_date, 'Partial children and adults', 'approved', 10, 2, 3, null),
  ('partial-composition-test', current_date, 'Partial mixed categories', 'approved', 10, 2, null, 3),
  ('partial-composition-test', current_date, 'Partial adults and retirees', 'approved', 10, null, 2, 3),
  ('partial-composition-test', current_date, 'Unknown composition', 'approved', 10, null, null, null),
  ('partial-composition-test', current_date, 'Complete composition', 'approved', 10, 2, 5, 3);

select is((select count(*)::integer from public.actions where created_by_clerk_id = 'partial-composition-test'), 8,
  'zero, independent partial categories and complete compositions persist');
select is((select children_count from public.actions where location_label = 'Partial children only'), 0,
  'explicit zero remains distinct from an unknown category');
select is((select adult_count from public.actions where location_label = 'Partial mixed categories'), null::integer,
  'an unknown category remains NULL when other categories are known');

create function pg_temp.reject_incoherent_partial_composition() returns boolean
language plpgsql as $$
begin
  begin
    insert into public.actions (
      created_by_clerk_id, action_date, location_label, status, volunteers_count,
      children_count, adult_count, retired_count
    ) values ('partial-composition-test', current_date, 'Invalid partial sum', 'approved', 10, 6, null, 5);
  exception when check_violation then
    return true;
  end;
  return false;
end;
$$;

create function pg_temp.reject_incoherent_complete_composition() returns boolean
language plpgsql as $$
begin
  begin
    insert into public.actions (
      created_by_clerk_id, action_date, location_label, status, volunteers_count,
      children_count, adult_count, retired_count
    ) values ('partial-composition-test', current_date, 'Invalid complete sum', 'approved', 10, 2, 5, 2);
  exception when check_violation then
    return true;
  end;
  return false;
end;
$$;

select ok(pg_temp.reject_incoherent_partial_composition(), 'known partial categories cannot exceed the declared total');
select ok(pg_temp.reject_incoherent_complete_composition(), 'a complete composition must equal the declared total');

reset role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"partial-composition-rpc-test"}', true);
create function pg_temp.accepts_coherent_partial_composition_in_rpc() returns boolean
language plpgsql as $$
begin
  begin
    perform * from public.create_action_with_relations_legacy(
      jsonb_build_object(
        'created_by_clerk_id', 'partial-composition-rpc-test',
        'client_request_id', null,
        'action_date', current_date + 1,
        'location_label', null,
        'volunteers_count', 10,
        'children_count', 3,
        'adult_count', null,
        'retired_count', 2,
        'status', 'pending',
        'action_phase', 'pre_action'
      ),
      '[]'::jsonb,
      '[]'::jsonb,
      'partial-composition-rpc-test', null, null, false
    );
  exception
    when not_null_violation then return true;
    when sqlstate '22023' then return false;
  end;
  return false;
end;
$$;

select ok(pg_temp.accepts_coherent_partial_composition_in_rpc(),
  'legacy creation RPC passes coherent partial categories to the database insert');

create function pg_temp.reject_incoherent_rpc_composition() returns boolean
language plpgsql as $$
begin
  begin
    perform set_config('request.jwt.claims', '{"role":"service_role","sub":"partial-composition-rpc-invalid"}', true);
    perform * from public.create_action_with_relations_legacy(
      jsonb_build_object(
        'created_by_clerk_id', 'partial-composition-rpc-invalid',
        'client_request_id', null,
        'action_date', current_date + 1,
        'location_label', 'RPC invalid partial composition',
        'volunteers_count', 10,
        'children_count', 7,
        'adult_count', null,
        'retired_count', 5,
        'status', 'pending',
        'action_phase', 'pre_action'
      ),
      '[]'::jsonb,
      '[]'::jsonb,
      'partial-composition-rpc-invalid', null, null, false
    );
  exception when sqlstate '22023' then
    return true;
  end;
  return false;
end;
$$;

select ok(pg_temp.reject_incoherent_rpc_composition(), 'legacy creation RPC rejects known partial categories above the total');

select * from finish();
rollback;
