begin;

select plan(8);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"collection-integrity-test"}', true);

insert into public.actions (created_by_clerk_id, action_date, location_label, status, volunteers_count, collectors_count)
values ('collection-integrity-test', current_date, 'Unknown collector count', 'approved', 20, null),
       ('collection-integrity-test', current_date, 'Known zero collectors', 'approved', 20, 0),
       ('collection-integrity-test', current_date, 'Known one collector', 'approved', 20, 1);

select is((select collectors_count from public.actions where location_label = 'Unknown collector count'), null::integer,
  'unknown collector count remains NULL');
select is((select collectors_count from public.actions where location_label = 'Known zero collectors'), 0,
  'known zero remains distinct from unknown');

create function pg_temp.reject_positive_measure_without_collection() returns boolean
language plpgsql as $$
begin
  begin
    insert into public.action_participants (
      action_id, user_id, participation_status, collection_status, individual_waste_kg
    )
    select id, 'integrity-not-collected', 'confirmed', 'not_collected', 0.1
      from public.actions where location_label = 'Unknown collector count';
    set constraints action_participants_collection_consistency immediate;
  exception when check_violation then
    return true;
  end;
  return false;
end;
$$;

select ok(pg_temp.reject_positive_measure_without_collection(),
  'a positive individual measure contradicting not_collected is rejected');

insert into public.action_participants (action_id, user_id, participation_status, collection_status)
select id, 'integrity-first-collector', 'confirmed', 'collected'
  from public.actions where location_label = 'Known one collector';

create function pg_temp.reject_collector_count_underflow() returns boolean
language plpgsql as $$
begin
  begin
    update public.actions set collectors_count = 0
     where location_label = 'Known one collector';
    set constraints actions_collection_consistency immediate;
  exception when check_violation then
    return true;
  end;
  return false;
end;
$$;

select ok(pg_temp.reject_collector_count_underflow(),
  'an aggregate count below confirmed collectors is rejected');

select is((select count(*)::integer from public.action_participants where user_id = 'integrity-first-collector'), 1,
  'the existing confirmed participant is preserved after a rejected aggregate update');
select is((select collectors_count from public.actions where location_label = 'Known one collector'), 1,
  'the aggregate count is restored after its deferred consistency check fails');

update public.actions
   set collectors_count = 0
 where location_label = 'Known one collector';
update public.action_participants
   set collection_status = 'not_collected'
 where user_id = 'integrity-first-collector';
set constraints actions_collection_consistency, action_participants_collection_consistency immediate;

select is((select collectors_count from public.actions where location_label = 'Known one collector'), 0,
  'a coordinated participant and aggregate transition can reach a known zero');
select is((
  select count(*)::integer
    from public.action_participants
   where user_id = 'integrity-first-collector'
     and participation_status = 'confirmed'
     and collection_status = 'collected'
), 0,
  'the zero aggregate has no confirmed collected participant');

rollback;
