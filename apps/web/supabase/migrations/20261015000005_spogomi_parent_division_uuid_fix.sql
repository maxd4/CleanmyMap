-- SPOGOMI parent division correction: resolve the sole UUID with array_agg;
-- PostgreSQL does not define min(uuid).

create or replace function public.spogomi_fill_legacy_single_division()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_division_id uuid;
  v_division_count integer;
begin
  if new.division_id is not null then
    return new;
  end if;
  select count(*)::integer, (array_agg(id order by id))[1]
    into v_division_count, v_division_id
    from public.spogomi_divisions
   where event_id = new.event_id;
  if v_division_count = 1 then
    new.division_id := v_division_id;
    return new;
  end if;
  raise exception using errcode = 'check_violation', message = 'A SPOGOMI row on a mixed edition requires an explicit division_id';
end;
$$;
