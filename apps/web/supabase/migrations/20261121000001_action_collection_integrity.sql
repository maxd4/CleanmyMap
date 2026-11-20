-- Serialize collection facts through the owning action row and validate the
-- final transaction state. Unknown counts and statuses remain NULL.
create or replace function public.lock_action_collection_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action_id uuid;
begin
  if tg_op = 'UPDATE' and old.action_id is distinct from new.action_id then
    for v_action_id in
      select distinct action_id
        from unnest(array[old.action_id, new.action_id]) as action_ids(action_id)
       order by action_id
    loop
      perform 1 from public.actions where id = v_action_id for update;
    end loop;
    return new;
  end if;

  v_action_id := case when tg_op = 'DELETE' then old.action_id else new.action_id end;
  perform 1 from public.actions where id = v_action_id for update;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.assert_action_collection_consistency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action_id uuid;
  v_collectors_count integer;
  v_confirmed_collectors bigint;
  v_contradictory_measurements bigint;
begin
  if tg_table_name = 'actions' then
    v_action_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    v_action_id := case when tg_op = 'DELETE' then old.action_id else new.action_id end;
  end if;

  select collectors_count into v_collectors_count
    from public.actions where id = v_action_id;
  if not found then return null; end if;

  select count(*) into v_confirmed_collectors
    from public.action_participants
   where action_id = v_action_id
     and participation_status = 'confirmed'
     and collection_status = 'collected';
  if v_collectors_count is not null and v_confirmed_collectors > v_collectors_count then
    raise exception 'Confirmed collectors exceed the action collectors_count'
      using errcode = '23514', constraint = 'action_collectors_count_consistency';
  end if;

  select count(*) into v_contradictory_measurements
    from public.action_participants
   where action_id = v_action_id
     and participation_status = 'confirmed'
     and collection_status = 'not_collected'
     and (coalesce(individual_waste_kg, 0) > 0
       or coalesce(individual_cigarette_butts_count, 0) > 0
       or coalesce(individual_cigarette_butts_mass_kg, 0) > 0);
  if v_contradictory_measurements > 0 then
    raise exception 'A participant marked not_collected has a positive individual measurement'
      using errcode = '23514', constraint = 'action_collection_measurement_consistency';
  end if;
  return null;
end;
$$;

create trigger action_participants_lock_collection_write
before insert or update or delete on public.action_participants
for each row execute function public.lock_action_collection_write();

create constraint trigger action_participants_collection_consistency
after insert or update or delete on public.action_participants
deferrable initially deferred
for each row execute function public.assert_action_collection_consistency();

create constraint trigger actions_collection_consistency
after insert or update of collectors_count, volunteers_count on public.actions
deferrable initially deferred
for each row execute function public.assert_action_collection_consistency();

revoke all on function public.lock_action_collection_write() from public, anon, authenticated;
revoke all on function public.assert_action_collection_consistency() from public, anon, authenticated;
